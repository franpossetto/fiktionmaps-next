import { unstable_cache } from "next/cache"
import { cache } from "react"
import { getSessionUserId } from "@/lib/auth/auth.service"
import { createAnonymousClient } from "@/lib/supabase/server"
import { createCitiesService } from "@/src/cities/city.services"
import { supabaseRepositoryAdapter as citiesSupabaseAdapter } from "@/src/cities/city.repository.adapter"
import { getAllCitiesWithClient } from "@/src/cities/city-cached-read"
import { getAllFictionsWithClient } from "@/src/fictions/fiction-cached-read"
import { createFictionsService } from "@/src/fictions/fiction.services"
import { supabaseRepositoryAdapter as fictionsSupabaseAdapter } from "@/src/fictions/fiction.repository.adapter"
import {
  createPlacesService,
  placesSupabaseAdapter,
} from "@/src/places"
import { createScenesService, scenesSupabaseAdapter } from "@/src/scenes"
import { createUsersService } from "@/src/users/user.services"
import { supabaseRepositoryAdapter } from "@/src/users/user.repository.adapter"
import { createHomesService, homesSupabaseAdapter } from "@/src/homes"
import { createCheckinsService, checkinsSupabaseAdapter } from "@/src/checkins"

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

/** Cached 60s so repeated page views don't hit Supabase every time. Uses anonymous client (no cookies) so it's safe inside unstable_cache. Invalidate with revalidateTag("cities", "page") after mutations. */
export const getAllCities = unstable_cache(
  async () => getAllCitiesWithClient(createAnonymousClient()),
  ["cities"],
  { revalidate: 60, tags: ["cities"] }
)
export const getCityById = citiesService.getById
export const createCity = citiesService.create
export const findOrCreateCity = citiesService.findOrCreate
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

const scenesService = createScenesService({
  scenesRepo: scenesSupabaseAdapter,
})

export const listScenes = scenesService.list.bind(scenesService)
export const getSceneById = scenesService.getById.bind(scenesService)
export const getScenesByFictionId = scenesService.getByFictionId.bind(scenesService)
export const getScenesByLocationId = scenesService.getByLocationId.bind(scenesService)
export const getScenesByPlaceId = scenesService.getByPlaceId.bind(scenesService)
export const createScene = scenesService.create.bind(scenesService)
export const updateScene = scenesService.update.bind(scenesService)
export const deleteScene = scenesService.remove.bind(scenesService)

export type { Scene } from "@/src/scenes/scene.domain"
export type { CreateSceneData, UpdateSceneData } from "@/src/scenes/scene.dtos"

const homesService = createHomesService({
  homesRepo: homesSupabaseAdapter,
  getCurrentUserId: getSessionUserId,
})

export const getMyHomes = homesService.getMyHomes
export const addHome = homesService.addHome
export const deleteHome = homesService.deleteHome

export type { UserHome, CreateHomeData } from "@/src/homes"

const checkinsService = createCheckinsService({
  checkinsRepo: checkinsSupabaseAdapter,
  getCurrentUserId: getSessionUserId,
})

export const checkinCity = checkinsService.checkinCity
export const checkinPlace = checkinsService.checkinPlace
export const getMyCityCheckins = checkinsService.getMyCityCheckins
export const getMyPlaceCheckins = checkinsService.getMyPlaceCheckins

export type { CityCheckin, PlaceCheckin, PlaceCheckinResult } from "@/src/checkins"
