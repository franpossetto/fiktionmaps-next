"use server"

import { revalidatePath } from "next/cache"
import {
  uploadEntityImage,
  validateImageFile,
} from "@/lib/asset-images/image-variant-service"

export type UploadPlaceImageResult =
  | { success: true; avatarUrl?: string }
  | { success: false; error: string }

export async function uploadPlaceImageAction(
  placeId: string,
  formData: FormData
): Promise<UploadPlaceImageResult> {
  const file = formData.get("file") as File | null
  if (!file || !(file instanceof File) || file.size === 0) {
    return { success: false, error: "No file provided" }
  }
  const validationError = validateImageFile(file)
  if (validationError) return { success: false, error: validationError }

  const result = await uploadEntityImage({
    entityType: "place",
    entityId: placeId,
    role: "avatar",
    variants: ["sm", "lg"],
    file,
    replace: true,
  })

  if (!result.success) return result

  revalidatePath("/admin")
  return { success: true, avatarUrl: result.urls.sm }
}
