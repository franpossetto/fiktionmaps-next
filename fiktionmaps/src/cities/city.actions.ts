"use server"

import { revalidatePath } from "next/cache"
import { createCity, updateCity, deleteCity } from "@/lib/app-services"
import type { City } from "./city.domain"

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
