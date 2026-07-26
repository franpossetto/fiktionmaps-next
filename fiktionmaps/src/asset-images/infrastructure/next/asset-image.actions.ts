"use server"

import { z } from "zod"
import type { EntityType, ImageRole } from "@/lib/asset-images/image-variant-service"
import { ensureAssetImageXsUseCase } from "@/src/asset-images/application/ensure-asset-image-xs.usecase"
import { updateAssetImageFocusUseCase } from "@/src/asset-images/application/update-asset-image-focus.usecase"

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
