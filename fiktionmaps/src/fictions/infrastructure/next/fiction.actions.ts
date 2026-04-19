"use server"

import { revalidatePath, updateTag } from "next/cache"
import { zodErrorMessage } from "@/lib/validation/http"
import { interestIdsBodySchema } from "@/lib/validation/api-payloads"
import { uuidSchema } from "@/lib/validation/primitives"
import { createClient } from "@/lib/supabase/server"
import { supabaseRepositoryAdapter as fictionsRepo } from "@/src/fictions/infrastructure/supabase/fiction.repository.impl"
import { supabaseRepositoryAdapter as fictionInterestsRepo } from "@/src/fiction-interests/infrastructure/supabase/fiction-interests.repository.impl"
import type { FictionWithMedia } from "@/src/fictions/domain/fiction.entity"
import { parseCreateFictionFormData, parseUpdateFictionFormData } from "./fiction.form-parsers"
import { createFictionUseCase } from "@/src/fictions/application/create-fiction.usecase"
import { updateFictionUseCase } from "@/src/fictions/application/update-fiction.usecase"
import { deleteFictionUseCase } from "@/src/fictions/application/delete-fiction.usecase"
import { getFictionInterestsUseCase } from "@/src/fiction-interests/application/get-fiction-interests.usecase"
import { setFictionInterestsUseCase } from "@/src/fiction-interests/application/set-fiction-interests.usecase"
import { getRecommendedFictionsUseCase } from "@/src/fictions/application/get-recommended-fictions.usecase"
import { uploadEntityImage, validateImageFile } from "@/lib/asset-images/image-variant-service"
import { getFictionLikeCountsByIds, getActiveFictionsCached, loadRecommendedFictionsDeps } from "./fiction.queries"
import type {
  CreateFictionResult,
  CreateFictionWithImagesResult,
  UpdateFictionResult,
  DeleteFictionResult,
  SetFictionActiveResult,
  UploadFictionImageResult,
  GetFictionInterestsResult,
  SetFictionInterestsResult,
  GetRecommendedFictionsResult,
} from "./fiction.actions.types"

export type {
  CreateFictionResult,
  CreateFictionWithImagesResult,
  UpdateFictionResult,
  DeleteFictionResult,
  SetFictionActiveResult,
  UploadFictionImageResult,
  GetFictionInterestsResult,
  SetFictionInterestsResult,
  GetRecommendedFictionsResult,
} from "./fiction.actions.types"

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
  const result = await uploadEntityImage({ entityType: "fiction", entityId: fictionId, role, variants, file, replace: true })

  if (!result.success) return result

  revalidatePath(`/admin/fiction/${fictionId}`)
  updateTag("fictions")

  if (role === "cover") {
    return { success: true, coverImage: result.urls.sm, coverImageLarge: result.urls.lg }
  }
  return { success: true, bannerImage: result.urls.lg }
}

export async function updateFictionAction(id: string, formData: FormData): Promise<UpdateFictionResult> {
  const parsed = parseUpdateFictionFormData(formData)
  if (!parsed.success) return { success: false, error: zodErrorMessage(parsed.error) }

  const fiction = await updateFictionUseCase(id, parsed.data, fictionsRepo)
  if (!fiction) return { success: false, error: "Failed to update fiction" }

  revalidatePath("/admin")
  revalidatePath(`/admin/fiction/${id}`)
  updateTag("fictions")
  return { success: true, fiction }
}

export async function createFictionAction(formData: FormData): Promise<CreateFictionResult> {
  const parsed = parseCreateFictionFormData(formData)
  if (!parsed.success) return { success: false, error: zodErrorMessage(parsed.error) }

  const fiction = await createFictionUseCase(parsed.data, fictionsRepo)
  if (!fiction) return { success: false, error: "Failed to create fiction" }

  revalidatePath("/admin")
  updateTag("fictions")
  return { success: true, fiction }
}

export async function createFictionWithImagesAction(formData: FormData): Promise<CreateFictionWithImagesResult> {
  const parsed = parseCreateFictionFormData(formData)
  if (!parsed.success) return { success: false, error: zodErrorMessage(parsed.error) }

  const fiction = await createFictionUseCase(parsed.data, fictionsRepo)
  if (!fiction) return { success: false, error: "Failed to create fiction" }

  const coverFile = formData.get("coverFile")
  if (coverFile instanceof File && coverFile.size > 0) {
    const coverValidationError = validateImageFile(coverFile)
    if (coverValidationError) return { success: false, error: coverValidationError }

    const coverUpload = await uploadEntityImage({
      entityType: "fiction",
      entityId: fiction.id,
      role: "cover",
      variants: ["sm", "lg"],
      file: coverFile,
      replace: true,
    })
    if (!coverUpload.success) return { success: false, error: coverUpload.error }
  }

  const bannerFile = formData.get("bannerFile")
  if (bannerFile instanceof File && bannerFile.size > 0) {
    const bannerValidationError = validateImageFile(bannerFile)
    if (bannerValidationError) return { success: false, error: bannerValidationError }

    const bannerUpload = await uploadEntityImage({
      entityType: "fiction",
      entityId: fiction.id,
      role: "banner",
      variants: ["lg"],
      file: bannerFile,
      replace: true,
    })
    if (!bannerUpload.success) return { success: false, error: bannerUpload.error }
  }

  revalidatePath("/admin")
  revalidatePath(`/admin/fiction/${fiction.id}`)
  updateTag("fictions")
  return { success: true, fiction }
}

export async function deleteFictionAction(id: string): Promise<DeleteFictionResult> {
  const ok = await deleteFictionUseCase(id, fictionsRepo)
  if (!ok) return { success: false, error: "Failed to delete fiction" }
  revalidatePath("/admin")
  revalidatePath(`/admin/fiction/${id}`)
  updateTag("fictions")
  return { success: true }
}

export async function setFictionActiveAction(id: string, active: boolean): Promise<SetFictionActiveResult> {
  const fiction = await updateFictionUseCase(id, { active }, fictionsRepo)
  if (!fiction) return { success: false, error: "Failed to update fiction" }
  revalidatePath("/admin")
  revalidatePath(`/admin/fiction/${id}`)
  updateTag("fictions")
  return { success: true, fiction }
}

export async function getFictionInterestsAction(fictionId: string): Promise<GetFictionInterestsResult> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { success: false, error: "Unauthorized" }

  if (!uuidSchema.safeParse(fictionId).success) {
    return { success: false, error: "Invalid fictionId" }
  }

  try {
    const interestIds = await getFictionInterestsUseCase(fictionId, fictionInterestsRepo)
    return { success: true, interestIds }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to load interests" }
  }
}

export async function getFictionLikeCountsAction(fictionIds: string[]): Promise<Record<string, number>> {
  return getFictionLikeCountsByIds(fictionIds)
}

export async function getActiveFictionsAction(): Promise<FictionWithMedia[]> {
  return getActiveFictionsCached()
}

export async function setFictionInterestsAction(fictionId: string, interestIds: string[]): Promise<SetFictionInterestsResult> {
  const parsed = interestIdsBodySchema.safeParse({ interestIds })
  if (!parsed.success) return { success: false, error: zodErrorMessage(parsed.error) }

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { success: false, error: "Unauthorized" }

  if (!uuidSchema.safeParse(fictionId).success) {
    return { success: false, error: "Invalid fictionId" }
  }

  try {
    await setFictionInterestsUseCase(fictionId, parsed.data.interestIds, fictionInterestsRepo)
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to set interests" }
  }

  revalidatePath("/admin")
  revalidatePath(`/admin/fiction/${fictionId}`)
  updateTag("fictions")
  return { success: true }
}

export async function getRecommendedFictionsAction(limit?: number): Promise<GetRecommendedFictionsResult> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { success: false, error: "Unauthorized" }

  const lim = limit != null && Number.isFinite(limit) ? Math.max(1, Math.min(50, Math.floor(Number(limit)))) : 12

  try {
    const fictions = await getRecommendedFictionsUseCase(user.id, lim, loadRecommendedFictionsDeps())
    return { success: true, fictions }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to load recommendations" }
  }
}
