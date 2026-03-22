"use server"

import { revalidatePath, revalidateTag } from "next/cache"
import { createFiction, updateFiction, deleteFiction } from "@/lib/app-services"
import type { Fiction } from "./fiction.domain"
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
  const title = formData.get("title") as string | null
  const type = formData.get("type") as "movie" | "book" | "tv-series" | null
  const yearStr = formData.get("year") as string | null
  const genre = formData.get("genre") as string | null
  const description = formData.get("synopsis") as string | null
  const author = (formData.get("author") as string)?.trim() || null
  const director = (formData.get("director") as string)?.trim() || null
  const active = formData.get("active") !== "false"
  const runtimeMinutesRaw = ((formData.get("runtimeMinutes") as string) ?? "").trim()

  if (!title?.trim()) return { success: false, error: "Title is required" }
  if (!type || !["movie", "book", "tv-series"].includes(type))
    return { success: false, error: "Type must be movie, book, or tv-series" }
  const year = yearStr ? parseInt(yearStr, 10) : NaN
  if (Number.isNaN(year) || year < 1900 || year > new Date().getFullYear())
    return { success: false, error: "Invalid year" }
  if (!genre?.trim()) return { success: false, error: "Genre is required" }
  if (!description?.trim()) return { success: false, error: "Description is required" }

  let duration_sec: number | null = null
  if (type === "movie" || type === "tv-series") {
    if (runtimeMinutesRaw !== "") {
      const n = parseInt(runtimeMinutesRaw, 10)
      if (Number.isNaN(n) || n <= 0)
        return { success: false, error: "Runtime must be a positive number of minutes" }
      duration_sec = n * 60
    }
  }

  const fiction = await updateFiction(id, {
    title: title.trim(),
    type,
    year,
    author: type === "movie" ? director : author,
    genre: genre.trim(),
    description: description.trim(),
    active,
    duration_sec,
  })

  if (!fiction) return { success: false, error: "Failed to update fiction" }

  revalidatePath("/admin")
  revalidatePath(`/admin/fiction/${id}`)
  revalidateTag("fictions", "page")
  return { success: true, fiction }
}

export async function createFictionAction(formData: FormData): Promise<CreateFictionResult> {
  const title = formData.get("title") as string | null
  const type = formData.get("type") as "movie" | "book" | "tv-series" | null
  const yearStr = formData.get("year") as string | null
  const genre = formData.get("genre") as string | null
  const description = formData.get("synopsis") as string | null
  const active = formData.get("active") !== "false"

  if (!title?.trim()) return { success: false, error: "Title is required" }
  if (!type || !["movie", "book", "tv-series"].includes(type))
    return { success: false, error: "Type must be movie, book, or tv-series" }
  const year = yearStr ? parseInt(yearStr, 10) : NaN
  if (Number.isNaN(year) || year < 1900 || year > new Date().getFullYear())
    return { success: false, error: "Invalid year" }
  if (!genre?.trim()) return { success: false, error: "Genre is required" }
  if (!description?.trim()) return { success: false, error: "Description is required" }

  const runtimeMinutesRawCreate = ((formData.get("runtimeMinutes") as string) ?? "").trim()
  let duration_sec: number | null = null
  if ((type === "movie" || type === "tv-series") && runtimeMinutesRawCreate !== "") {
    const n = parseInt(runtimeMinutesRawCreate, 10)
    if (Number.isNaN(n) || n <= 0)
      return { success: false, error: "Runtime must be a positive number of minutes" }
    duration_sec = n * 60
  }
  if (type === "book") duration_sec = null

  const fiction = await createFiction({
    title: title.trim(),
    type,
    year,
    author: null,
    genre: genre.trim(),
    description: description.trim(),
    active,
    duration_sec,
  })

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
