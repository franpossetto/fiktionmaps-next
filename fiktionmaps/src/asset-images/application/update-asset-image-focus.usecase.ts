import { createClient } from "@/lib/supabase/server"
import {
  normalizeImageFocus,
  type ImageFocus,
} from "@/lib/asset-images/image-focus"
import type { EntityType, ImageRole } from "@/lib/asset-images/image-variant-service"

export type UpdateAssetImageFocusInput = {
  entityType: EntityType
  entityId: string
  role: ImageRole
  focus: ImageFocus
}

export type UpdateAssetImageFocusResult =
  | { success: true; focus: ImageFocus }
  | { success: false; error: string }

export async function updateAssetImageFocusUseCase(
  input: UpdateAssetImageFocusInput,
): Promise<UpdateAssetImageFocusResult> {
  if (!input.entityId.trim()) {
    return { success: false, error: "Missing entity id" }
  }

  const focus = normalizeImageFocus(input.focus.x, input.focus.y)
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("asset_images")
    .update({ focus_x: focus.x, focus_y: focus.y })
    .eq("entity_type", input.entityType)
    .eq("entity_id", input.entityId)
    .eq("role", input.role)
    .select("id")

  if (error) {
    return { success: false, error: error.message }
  }
  if (!data?.length) {
    return { success: false, error: "No asset images found for this role" }
  }

  return { success: true, focus }
}
