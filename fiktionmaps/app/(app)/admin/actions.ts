"use server"

import { revalidatePath } from "next/cache"
import { createFiction, updateFiction, deleteFiction } from "@/lib/app-services"
import { createCity, updateCity, deleteCity } from "@/lib/app-services"
import type { Fiction } from "@/src/fictions/fiction.domain"
import type { City } from "@/src/cities/city.domain"
import {
  uploadEntityImage,
  validateImageFile,
} from "@/lib/asset-images/image-variant-service"

export type CreateFictionResult =
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

  if (role === "cover") {
    return {
      success: true,
      coverImage: result.urls.sm,
      coverImageLarge: result.urls.lg,
    }
  }
  return { success: true, bannerImage: result.urls.lg }
}

export type UpdateFictionResult =
  | { success: true; fiction: Fiction }
  | { success: false; error: string }

export type DeleteFictionResult =
  | { success: true }
  | { success: false; error: string }

export type SetFictionActiveResult =
  | { success: true; fiction: Fiction }
  | { success: false; error: string }

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

  if (!title?.trim()) return { success: false, error: "Title is required" }
  if (!type || !["movie", "book", "tv-series"].includes(type))
    return { success: false, error: "Type must be movie, book, or tv-series" }
  const year = yearStr ? parseInt(yearStr, 10) : NaN
  if (Number.isNaN(year) || year < 1900 || year > new Date().getFullYear())
    return { success: false, error: "Invalid year" }
  if (!genre?.trim()) return { success: false, error: "Genre is required" }
  if (!description?.trim()) return { success: false, error: "Description is required" }

  const fiction = await updateFiction(id, {
    title: title.trim(),
    type,
    year,
    author: type === "movie" ? director : author,
    genre: genre.trim(),
    description: description.trim(),
    active,
  })

  if (!fiction) return { success: false, error: "Failed to update fiction" }

  revalidatePath("/admin")
  revalidatePath(`/admin/fiction/${id}`)
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

  const fiction = await createFiction({
    title: title.trim(),
    type,
    year,
    author: null,
    genre: genre.trim(),
    description: description.trim(),
    active,
  })

  if (!fiction) return { success: false, error: "Failed to create fiction" }

  revalidatePath("/admin")
  return { success: true, fiction }
}

export async function deleteFictionAction(id: string): Promise<DeleteFictionResult> {
  const ok = await deleteFiction(id)
  if (!ok) return { success: false, error: "Failed to delete fiction" }
  revalidatePath("/admin")
  revalidatePath(`/admin/fiction/${id}`)
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
  return { success: true, fiction }
}

// ——— Cities ———

export type CreateCityResult =
  | { success: true; city: City }
  | { success: false; error: string }

export type UpdateCityResult =
  | { success: true; city: City }
  | { success: false; error: string }

export type DeleteCityResult =
  | { success: true }
  | { success: false; error: string }

export async function createCityAction(formData: FormData): Promise<CreateCityResult> {
  const name = (formData.get("name") as string | null)?.trim()
  const country = (formData.get("country") as string | null)?.trim()
  const latStr = formData.get("lat") as string | null
  const lngStr = formData.get("lng") as string | null
  const zoomStr = formData.get("zoom") as string | null

  if (!name) return { success: false, error: "Name is required" }
  if (!country) return { success: false, error: "Country is required" }
  const lat = latStr ? parseFloat(latStr) : NaN
  const lng = lngStr ? parseFloat(lngStr) : NaN
  const zoom = zoomStr ? parseInt(zoomStr, 10) : NaN
  if (Number.isNaN(lat) || lat < -90 || lat > 90) return { success: false, error: "Invalid latitude" }
  if (Number.isNaN(lng) || lng < -180 || lng > 180) return { success: false, error: "Invalid longitude" }
  if (Number.isNaN(zoom) || zoom < 0 || zoom > 22) return { success: false, error: "Zoom must be 0–22" }

  const city = await createCity({ name, country, lat, lng, zoom })
  if (!city) return { success: false, error: "Failed to create city" }
  revalidatePath("/admin")
  return { success: true, city }
}

export async function updateCityAction(id: string, formData: FormData): Promise<UpdateCityResult> {
  const name = (formData.get("name") as string | null)?.trim()
  const country = (formData.get("country") as string | null)?.trim()
  const latStr = formData.get("lat") as string | null
  const lngStr = formData.get("lng") as string | null
  const zoomStr = formData.get("zoom") as string | null

  if (!name) return { success: false, error: "Name is required" }
  if (!country) return { success: false, error: "Country is required" }
  const lat = latStr ? parseFloat(latStr) : NaN
  const lng = lngStr ? parseFloat(lngStr) : NaN
  const zoom = zoomStr ? parseInt(zoomStr, 10) : NaN
  if (Number.isNaN(lat) || lat < -90 || lat > 90) return { success: false, error: "Invalid latitude" }
  if (Number.isNaN(lng) || lng < -180 || lng > 180) return { success: false, error: "Invalid longitude" }
  if (Number.isNaN(zoom) || zoom < 0 || zoom > 22) return { success: false, error: "Zoom must be 0–22" }

  const city = await updateCity(id, { name, country, lat, lng, zoom })
  if (!city) return { success: false, error: "Failed to update city" }
  revalidatePath("/admin")
  revalidatePath(`/admin/city/${id}`)
  return { success: true, city }
}

export async function deleteCityAction(id: string): Promise<DeleteCityResult> {
  const ok = await deleteCity(id)
  if (!ok) return { success: false, error: "Failed to delete city" }
  revalidatePath("/admin")
  revalidatePath(`/admin/city/${id}`)
  return { success: true }
}
