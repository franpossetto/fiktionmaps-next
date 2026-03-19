import { unstable_cache } from "next/cache"
import { cache } from "react"
import { getSessionUserId } from "@/lib/auth/auth.service"
import { createAnonymousClient } from "@/lib/supabase/server"
import { createCitiesService } from "@/src/cities/city.services"
import { supabaseRepositoryAdapter as citiesSupabaseAdapter } from "@/src/cities/city.repository.adapter"
import { getAllFictionsWithClient } from "@/src/fictions/fiction-cached-read"
import { createFictionsService } from "@/src/fictions/fiction.services"
import { supabaseRepositoryAdapter as fictionsSupabaseAdapter } from "@/src/fictions/fiction.repository.adapter"
import {
  createPlacesService,
  placesSupabaseAdapter,
} from "@/src/places"
import { createUsersService } from "@/src/users/user.services"
import { supabaseRepositoryAdapter } from "@/src/users/user.repository.adapter"

const usersService = createUsersService({
  usersRepo: supabaseRepositoryAdapter,
  getCurrentUserId: getSessionUserId,
})

export const getCurrentUserProfile = usersService.getCurrentUserProfile
export const getUserProfile = usersService.getUserProfile
export const updateCurrentUserProfile = usersService.updateCurrentUserProfile

export type { Profile } from "@/src/users/user.domain"
export type { UpdateProfileData, UserRole } from "@/src/users/user.dtos"

const fictionsService = createFictionsService({
  fictionsRepo: fictionsSupabaseAdapter,
})

/** Cached 60s so repeated page views don't hit Supabase every time. Uses anonymous client (no cookies) so it's safe inside unstable_cache. Invalidate with revalidateTag("fictions") after mutations. */
export const getAllFictions = unstable_cache(
  async () => getAllFictionsWithClient(createAnonymousClient()),
  ["fictions"],
  { revalidate: 60, tags: ["fictions"] }
)
/** Cached per-request so generateMetadata + page share one fetch. */
export const getFictionById = cache(fictionsService.getById.bind(fictionsService))
export const createFiction = fictionsService.create
export const updateFiction = fictionsService.update
export const deleteFiction = fictionsService.delete
export const getFictionCities = fictionsService.getFictionCities

export type { Fiction, FictionWithMedia } from "@/src/fictions/fiction.domain"
export type { CreateFictionData, UpdateFictionData } from "@/src/fictions/fiction.dtos"

const citiesService = createCitiesService({
  citiesRepo: citiesSupabaseAdapter,
})

export const getAllCities = citiesService.getAll
export const getCityById = citiesService.getById
export const createCity = citiesService.create
export const updateCity = citiesService.update
export const deleteCity = citiesService.delete
export const getCityFictions = citiesService.getCityFictions

export type { City } from "@/src/cities/city.domain"
export type { CreateCityData, UpdateCityData } from "@/src/cities/city.dtos"

const placesService = createPlacesService({
  placesRepo: placesSupabaseAdapter,
})

export const getAllPlaces = placesService.listAllAsLocations
export const createPlace = placesService.create
export const updatePlace = placesService.update

export type { Location } from "@/src/locations"
export type { CreatePlaceData, UpdatePlaceData } from "@/src/places"
