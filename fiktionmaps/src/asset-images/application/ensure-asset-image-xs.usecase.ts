import { ensureAssetImageXs } from "@/lib/asset-images/ensure-xs-variant"
import type { EntityType, ImageRole } from "@/lib/asset-images/image-variant-service"

export type EnsureAssetImageXsInput = {
  entityType: EntityType
  entityId: string
  role: ImageRole
}

export type EnsureAssetImageXsResult =
  | { success: true; url: string }
  | { success: false; error: string }

export async function ensureAssetImageXsUseCase(
  input: EnsureAssetImageXsInput,
): Promise<EnsureAssetImageXsResult> {
  if (!input.entityId.trim()) {
    return { success: false, error: "Missing entity id" }
  }
  return ensureAssetImageXs(input)
}
