import { createClient } from "@/lib/supabase/server"
import { createFictionsSupabaseAdapter } from "@/src/fictions/fiction.repository.adapter"
import { createFictionsService } from "@/src/fictions/fiction.services"
import { fictionsRepoPublic } from "./anon-repos"

const fictionsRepoSession = createFictionsSupabaseAdapter(createClient)
const fictionsService = createFictionsService({
  fictionsRepo: fictionsRepoSession,
})

export async function getAllFictionsUncached() {
  return fictionsRepoPublic.getAll()
}

export const getFictionByIdUncached = fictionsService.getById.bind(fictionsService)

export const createFiction = fictionsService.create
export const updateFiction = fictionsService.update
export const deleteFiction = fictionsService.delete
export const getFictionCities = fictionsService.getFictionCities
