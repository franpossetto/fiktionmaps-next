"use server"

import { revalidatePath, updateTag } from "next/cache"
import { zodErrorMessage } from "@/lib/validation/http"
import { uuidSchema } from "@/lib/validation/primitives"
import { supabaseRepositoryAdapter as citiesRepo } from "@/src/cities/infrastructure/supabase/city.repository.impl"
import { parseCityFormData } from "@/src/cities/domain/city.schemas"
import { createCityUseCase } from "@/src/cities/application/create-city.usecase"
import { updateCityUseCase } from "@/src/cities/application/update-city.usecase"
import { deleteCityUseCase } from "@/src/cities/application/delete-city.usecase"
import { findOrCreateCityUseCase } from "@/src/cities/application/find-or-create-city.usecase"
import type { CreateCityData } from "@/src/cities/domain/city.schemas"
import type { City } from "@/src/cities/domain/city.entity"
import type { FictionWithMedia } from "@/src/fictions/domain/fiction.entity"
import type {
  CreateCityResult,
  UpdateCityResult,
  DeleteCityResult,
  FindOrCreateCityResult,
} from "./city.actions.types"
import { getAllCitiesCached, getCityFictionsCached } from "./city.queries"

export type {
  CreateCityResult,
  UpdateCityResult,
  DeleteCityResult,
  FindOrCreateCityResult,
} from "./city.actions.types"

export async function getAllCitiesAction(): Promise<City[]> {
  return getAllCitiesCached()
}

/** Fictions that have at least one place in the city (e.g. map fiction selector). */
export async function getCityFictionsAction(cityId: string): Promise<FictionWithMedia[]> {
  if (!uuidSchema.safeParse(cityId).success) return []
  return getCityFictionsCached(cityId)
}

export async function createCityAction(formData: FormData): Promise<CreateCityResult> {
  const parsed = parseCityFormData(formData)
  if (!parsed.success) return { success: false, error: zodErrorMessage(parsed.error) }

  const city = await createCityUseCase(parsed.data, citiesRepo)
  if (!city) return { success: false, error: "Failed to create city" }
  revalidatePath("/admin")
  updateTag("cities")
  return { success: true, city }
}

export async function updateCityAction(id: string, formData: FormData): Promise<UpdateCityResult> {
  const parsed = parseCityFormData(formData)
  if (!parsed.success) return { success: false, error: zodErrorMessage(parsed.error) }

  const city = await updateCityUseCase(id, parsed.data, citiesRepo)
  if (!city) return { success: false, error: "Failed to update city" }
  revalidatePath("/admin")
  revalidatePath(`/admin/city/${id}`)
  updateTag("cities")
  return { success: true, city }
}

export async function deleteCityAction(id: string): Promise<DeleteCityResult> {
  const ok = await deleteCityUseCase(id, citiesRepo)
  if (!ok) return { success: false, error: "Failed to delete city" }
  revalidatePath("/admin")
  revalidatePath(`/admin/city/${id}`)
  updateTag("cities")
  return { success: true }
}

export async function findOrCreateCityAction(data: CreateCityData): Promise<FindOrCreateCityResult> {
  const city = await findOrCreateCityUseCase(data, citiesRepo)
  if (!city) return { success: false, error: "Failed to find or create city" }
  updateTag("cities")
  return { success: true, city }
}
