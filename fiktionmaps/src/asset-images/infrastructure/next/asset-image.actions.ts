"use server"

import { z } from "zod"
import { encodeImageVariant } from "@/lib/asset-images/encode-image-variant"
import {
  validateImageFile,
  type EntityType,
  type ImageRole,
} from "@/lib/asset-images/image-variant-service"
import type { ImageVariant } from "@/lib/asset-images/variant-sizes"
import { createClient } from "@/lib/supabase/server"
import { ensureAssetImageXsUseCase } from "@/src/asset-images/application/ensure-asset-image-xs.usecase"
import { updateAssetImageFocusUseCase } from "@/src/asset-images/application/update-asset-image-focus.usecase"
import { isUserAdminUseCase } from "@/src/users/application/is-user-admin.usecase"
import { createUsersSupabaseAdapter } from "@/src/users/infrastructure/supabase/user.repository.impl"

const usersRepo = createUsersSupabaseAdapter(createClient)

const ensureXsSchema = z.object({
  entityType: z.enum(["fiction", "city", "location", "scene", "profile", "place"]),
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
  entityType: z.enum(["fiction", "city", "location", "scene", "profile", "place"]),
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
