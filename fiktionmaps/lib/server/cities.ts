import { createCitiesService } from "@/src/cities/city.services"
import {
  supabaseRepositoryAdapter as citiesSessionRepo,
} from "@/src/cities/city.repository.adapter"
import { citiesRepoPublic, fictionsRepoPublic, placesRepoPublic } from "./anon-repos"

const citiesService = createCitiesService({
  citiesRepo: citiesSessionRepo,
  placesRepo: placesRepoPublic,
  fictionsRepo: fictionsRepoPublic,
})

export async function getAllCitiesUncached() {
  return citiesRepoPublic.getAll()
}

export async function getCityFictionsUncached(cityId: string) {
  return citiesService.getCityFictions(cityId)
}

export const getCityById = citiesService.getById
export const createCity = citiesService.create
export const findOrCreateCity = citiesService.findOrCreate
export const updateCity = citiesService.update
export const deleteCity = citiesService.delete
