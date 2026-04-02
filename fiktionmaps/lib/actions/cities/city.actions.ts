"use server"

import { revalidatePath, revalidateTag } from "next/cache"
import { zodErrorMessage } from "@/lib/validation/http"
import { createCity, findOrCreateCity, updateCity, deleteCity } from "@/lib/server"
import { cityWriteSchema } from "@/src/cities/city.schemas"
import type { City } from "@/src/cities/city.domain"

export type CreateCityResult =
  | { success: true; city: City }
  | { success: false; error: string }

export type UpdateCityResult =
  | { success: true; city: City }
  | { success: false; error: string }

export type DeleteCityResult =
  | { success: true }
  | { success: false; error: string }

function parseCityFormData(formData: FormData) {
  return cityWriteSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    country: String(formData.get("country") ?? ""),
    lat: String(formData.get("lat") ?? ""),
    lng: String(formData.get("lng") ?? ""),
    zoom: String(formData.get("zoom") ?? ""),
  })
}

export async function createCityAction(formData: FormData): Promise<CreateCityResult> {
  const parsed = parseCityFormData(formData)
  if (!parsed.success) return { success: false, error: zodErrorMessage(parsed.error) }

  const city = await createCity(parsed.data)
  if (!city) return { success: false, error: "Failed to create city" }
  revalidatePath("/admin")
  revalidateTag("cities", "page")
  return { success: true, city }
}

export async function updateCityAction(id: string, formData: FormData): Promise<UpdateCityResult> {
  const parsed = parseCityFormData(formData)
  if (!parsed.success) return { success: false, error: zodErrorMessage(parsed.error) }

  const city = await updateCity(id, parsed.data)
  if (!city) return { success: false, error: "Failed to update city" }
  revalidatePath("/admin")
  revalidatePath(`/admin/city/${id}`)
  revalidateTag("cities", "page")
  return { success: true, city }
}

export async function deleteCityAction(id: string): Promise<DeleteCityResult> {
  const ok = await deleteCity(id)
  if (!ok) return { success: false, error: "Failed to delete city" }
  revalidatePath("/admin")
  revalidatePath(`/admin/city/${id}`)
  revalidateTag("cities", "page")
  return { success: true }
}

export type FindOrCreateCityResult =
  | { success: true; city: City }
  | { success: false; error: string }

export async function findOrCreateCityAction(data: {
  name: string
  country: string
  lat: number
  lng: number
}): Promise<FindOrCreateCityResult> {
  const city = await findOrCreateCity({
    name: data.name,
    country: data.country,
    lat: data.lat,
    lng: data.lng,
    zoom: 12,
  })
  if (!city) return { success: false, error: "Failed to find or create city" }
  revalidateTag("cities", "page")
  return { success: true, city }
}
