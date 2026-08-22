"use server"

import { z } from "zod"
import { encodeImageVariant } from "@/lib/asset-images/encode-image-variant"
import {
  validateImageFile,
  type EntityType,
  type ImageRole,
} from "@/lib/asset-images/image-variant-service"
import {
  VARIANT_AVIF_EFFORT,
  VARIANT_SIZES,
  type ImageVariant,
} from "@/lib/asset-images/variant-sizes"
import { createClient } from "@/lib/supabase/server"
import { ensureAssetImageXsUseCase } from "@/src/asset-images/application/ensure-asset-image-xs.usecase"
import { updateAssetImageFocusUseCase } from "@/src/asset-images/application/update-asset-image-focus.usecase"
import { isUserAdminUseCase } from "@/src/users/application/is-user-admin.usecase"
import { createUsersSupabaseAdapter } from "@/src/users/infrastructure/supabase/user.repository.impl"
import sharp from "sharp"

const usersRepo = createUsersSupabaseAdapter(createClient)

const ensureXsSchema = z.object({
  entityType: z.enum(["fiction", "city", "location", "scene", "profile", "place", "person"]),
  entityId: z.string().uuid(),
  role: z.enum(["cover", "banner", "avatar", "hero"]),
})

export type EnsureAssetImageXsActionResult =
  | { success: true; url: string }
  | { success: false; error: string }

export async function ensureAssetImageXsAction(input: {
  entityType: EntityType
  entityId: string
  role: ImageRole
}): Promise<EnsureAssetImageXsActionResult> {
  const parsed = ensureXsSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: "Invalid input" }
  }
  const result = await ensureAssetImageXsUseCase(parsed.data)
  if (!result.success) {
    console.error("[ensureAssetImageXsAction]", parsed.data, result.error)
  }
  return result
}

const updateFocusSchema = z.object({
  entityType: z.enum(["fiction", "city", "location", "scene", "profile", "place", "person"]),
  entityId: z.string().uuid(),
  role: z.enum(["cover", "banner", "avatar", "hero"]),
  focusX: z.number().min(0).max(100),
  focusY: z.number().min(0).max(100),
})

export type UpdateAssetImageFocusActionResult =
  | { success: true; focus: { x: number; y: number } }
  | { success: false; error: string }

export async function updateAssetImageFocusAction(input: {
  entityType: EntityType
  entityId: string
  role: ImageRole
  focusX: number
  focusY: number
}): Promise<UpdateAssetImageFocusActionResult> {
  const parsed = updateFocusSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: "Invalid input" }
  }
  return updateAssetImageFocusUseCase({
    entityType: parsed.data.entityType,
    entityId: parsed.data.entityId,
    role: parsed.data.role,
    focus: { x: parsed.data.focusX, y: parsed.data.focusY },
  })
}

export type ImageCodecPreviewVariant = {
  codec: "webp" | "avif"
  variant: ImageVariant
  /** Encode quality used (WebP or AVIF). */
  quality: number
  byteLength: number
  width: number
  height: number
  dataUrl: string
}

export type PreviewImageCodecsResult =
  | { success: true; previews: ImageCodecPreviewVariant[] }
  | { success: false; error: string }

function parseVariants(raw: FormDataEntryValue | null): ImageVariant[] {
  if (typeof raw !== "string" || !raw.trim()) return ["lg"]
  return raw
    .split(",")
    .map((v) => v.trim())
    .filter((v): v is ImageVariant => v === "xs" || v === "sm" || v === "lg" || v === "xl")
}

/**
 * Admin-only: encode variants as WebP + AVIF (q48) in memory for comparison.
 * No Storage write.
 */
export async function previewImageCodecsAction(
  formData: FormData,
): Promise<PreviewImageCodecsResult> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: "Unauthorized" }
  }

  const isAdmin = await isUserAdminUseCase(user.id, usersRepo)
  if (!isAdmin) {
    return { success: false, error: "Unauthorized" }
  }

  const file = formData.get("file")
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: "No file provided" }
  }

  const validationError = validateImageFile(file)
  if (validationError) {
    return { success: false, error: validationError }
  }

  const variants = parseVariants(formData.get("variants"))
  if (!variants.length) {
    return { success: false, error: "No variants requested" }
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const previews: ImageCodecPreviewVariant[] = []

  for (const variant of variants) {
    for (const codec of ["webp", "avif"] as const) {
      const encoded = await encodeImageVariant(buffer, variant, codec)
      previews.push({
        codec,
        variant,
        quality: encoded.quality,
        byteLength: encoded.buffer.byteLength,
        width: encoded.width,
        height: encoded.height,
        dataUrl: `data:${encoded.contentType};base64,${encoded.buffer.toString("base64")}`,
      })
    }
  }

  return { success: true, previews }
}

export type ImageCodecLabOriginal = {
  byteLength: number
  width: number
  height: number
  format: string | null
}

export type ImageCodecLabPreview = {
  codec: "webp" | "avif"
  /** Lab size key: xs|sm|lg|xl|src */
  size: "xs" | "sm" | "lg" | "xl" | "src"
  quality: number
  effort: number | null
  /** Target max width; null when size=src (no resize). */
  maxWidth: number | null
  byteLength: number
  width: number
  height: number
  dataUrl: string
}

export type PreviewImageCodecLabResult =
  | {
      success: true
      original: ImageCodecLabOriginal
      preview: ImageCodecLabPreview
    }
  | { success: false; error: string }

const labSizeSchema = z.enum(["src", "xs", "sm", "lg", "xl"])
const labCodecSchema = z.enum(["webp", "avif"])

/**
 * Admin-only provisional lab: original vs one transform (codec + size + quality).
 * `src` keeps original pixels (no resize). No Storage write.
 */
export async function previewImageCodecLabAction(
  formData: FormData,
): Promise<PreviewImageCodecLabResult> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: "Unauthorized" }
  }

  const isAdmin = await isUserAdminUseCase(user.id, usersRepo)
  if (!isAdmin) {
    return { success: false, error: "Unauthorized" }
  }

  const file = formData.get("file")
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: "No file provided" }
  }

  const validationError = validateImageFile(file)
  if (validationError) {
    return { success: false, error: validationError }
  }

  const sizeParsed = labSizeSchema.safeParse(
    typeof formData.get("size") === "string"
      ? formData.get("size")
      : typeof formData.get("variant") === "string"
        ? formData.get("variant")
        : "",
  )
  if (!sizeParsed.success) {
    return { success: false, error: "Invalid size" }
  }
  const size = sizeParsed.data

  const codecParsed = labCodecSchema.safeParse(
    typeof formData.get("codec") === "string" ? formData.get("codec") : "avif",
  )
  if (!codecParsed.success) {
    return { success: false, error: "Invalid codec" }
  }
  const codec = codecParsed.data

  const qualityRaw = Number(
    formData.get("quality") ??
      (codec === "avif" ? formData.get("avifQuality") : formData.get("webpQuality")),
  )
  const quality = Number.isFinite(qualityRaw)
    ? Math.min(100, Math.max(1, Math.round(qualityRaw)))
    : codec === "avif"
      ? 48
      : 85

  const effortRaw = Number(formData.get("effort"))
  const effort =
    codec === "avif" && Number.isFinite(effortRaw)
      ? Math.min(9, Math.max(0, Math.round(effortRaw)))
      : VARIANT_AVIF_EFFORT

  const buffer = Buffer.from(await file.arrayBuffer())
  const meta = await sharp(buffer).metadata()
  const encodeVariant = size === "src" ? "xl" : size
  const maxWidth = size === "src" ? null : VARIANT_SIZES[size]

  const encoded = await encodeImageVariant(buffer, encodeVariant, codec, {
    quality,
    effort: codec === "avif" ? effort : undefined,
    maxWidth,
  })

  return {
    success: true,
    original: {
      byteLength: buffer.byteLength,
      width: meta.width ?? 0,
      height: meta.height ?? 0,
      format: meta.format ?? null,
    },
    preview: {
      codec,
      size,
      quality: encoded.quality,
      effort: encoded.effort,
      maxWidth,
      byteLength: encoded.buffer.byteLength,
      width: encoded.width,
      height: encoded.height,
      dataUrl: `data:${encoded.contentType};base64,${encoded.buffer.toString("base64")}`,
    },
  }
}
