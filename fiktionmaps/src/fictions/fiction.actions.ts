"use server"

import { revalidatePath, revalidateTag } from "next/cache"
import { zodErrorMessage } from "@/lib/validation/http"
import { createFiction, updateFiction, deleteFiction } from "@/lib/app-services"
import type { Fiction } from "./fiction.domain"
import {
  parseCreateFictionFormData,
  parseUpdateFictionFormData,
} from "./fiction.schemas"
import {
  uploadEntityImage,
  validateImageFile,
} from "@/lib/asset-images/image-variant-service"

export type CreateFictionResult =
  | { success: true; fiction: Fiction }
  | { success: false; error: string }

export type UpdateFictionResult =
  | { success: true; fiction: Fiction }
  | { success: false; error: string }

export type DeleteFictionResult =
  | { success: true }
  | { success: false; error: string }

export type SetFictionActiveResult =
  | { success: true; fiction: Fiction }
  | { success: false; error: string }

export type UploadFictionImageResult =
  | { success: true; coverImage?: string; coverImageLarge?: string; bannerImage?: string }
  | { success: false; error: string }

export async function uploadFictionImageAction(
  fictionId: string,
  role: "cover" | "banner",
  formData: FormData
): Promise<UploadFictionImageResult> {
  const file = formData.get("file") as File | null
  if (!file || !(file instanceof File) || file.size === 0) {
    return { success: false, error: "No file provided" }
  }
  const validationError = validateImageFile(file)
  if (validationError) return { success: false, error: validationError }

  const variants: ("sm" | "lg" | "xl")[] = role === "cover" ? ["sm", "lg"] : ["lg"]
  const result = await uploadEntityImage({
    entityType: "fiction",
    entityId: fictionId,
    role,
    variants,
    file,
    replace: true,
  })

  if (!result.success) return result

  revalidatePath("/admin")
  revalidatePath(`/admin/fiction/${fictionId}`)
  revalidateTag("fictions", "page")

  if (role === "cover") {
    return {
      success: true,
      coverImage: result.urls.sm,
      coverImageLarge: result.urls.lg,
    }
  }
  return { success: true, bannerImage: result.urls.lg }
}

export async function updateFictionAction(
  id: string,
  formData: FormData
): Promise<UpdateFictionResult> {
  const parsed = parseUpdateFictionFormData(formData)
  if (!parsed.success) return { success: false, error: zodErrorMessage(parsed.error) }

  const fiction = await updateFiction(id, parsed.data)

  if (!fiction) return { success: false, error: "Failed to update fiction" }

  revalidatePath("/admin")
  revalidatePath(`/admin/fiction/${id}`)
  revalidateTag("fictions", "page")
  return { success: true, fiction }
}

export async function createFictionAction(formData: FormData): Promise<CreateFictionResult> {
  const parsed = parseCreateFictionFormData(formData)
  if (!parsed.success) return { success: false, error: zodErrorMessage(parsed.error) }

  const fiction = await createFiction(parsed.data)

  if (!fiction) return { success: false, error: "Failed to create fiction" }

  revalidatePath("/admin")
  revalidateTag("fictions", "page")
  return { success: true, fiction }
}

export async function deleteFictionAction(id: string): Promise<DeleteFictionResult> {
  const ok = await deleteFiction(id)
  if (!ok) return { success: false, error: "Failed to delete fiction" }
  revalidatePath("/admin")
  revalidatePath(`/admin/fiction/${id}`)
  revalidateTag("fictions", "page")
  return { success: true }
}

export async function setFictionActiveAction(
  id: string,
  active: boolean
): Promise<SetFictionActiveResult> {
  const fiction = await updateFiction(id, { active })
  if (!fiction) return { success: false, error: "Failed to update fiction" }
  revalidatePath("/admin")
  revalidatePath(`/admin/fiction/${id}`)
  revalidateTag("fictions", "page")
  return { success: true, fiction }
}
