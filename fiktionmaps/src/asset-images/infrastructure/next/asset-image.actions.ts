"use server"

import { z } from "zod"
import type { EntityType, ImageRole } from "@/lib/asset-images/image-variant-service"
import { ensureAssetImageXsUseCase } from "@/src/asset-images/application/ensure-asset-image-xs.usecase"

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
