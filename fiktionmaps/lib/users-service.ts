import { getSessionUserId } from "@/lib/auth/auth.service"
import { createCitiesService } from "@/modules/cities/city.services"
import { supabaseRepositoryAdapter as citiesSupabaseAdapter } from "@/modules/cities/city.repository.adapter"
import { createFictionsService } from "@/modules/fictions/fiction.services"
import { supabaseRepositoryAdapter as fictionsSupabaseAdapter } from "@/modules/fictions/fiction.repository.adapter"
import { createUsersService } from "@/modules/users/user.services"
import { supabaseRepositoryAdapter } from "@/modules/users/user.repository.adapter"

const usersService = createUsersService({
  usersRepo: supabaseRepositoryAdapter,
  getCurrentUserId: getSessionUserId,
})

export const getCurrentUserProfile = usersService.getCurrentUserProfile
export const getUserProfile = usersService.getUserProfile
export const updateCurrentUserProfile = usersService.updateCurrentUserProfile

export type { Profile } from "@/modules/users/user.domain"
export type { UpdateProfileData, UserRole } from "@/modules/users/user.dtos"

const fictionsService = createFictionsService({
  fictionsRepo: fictionsSupabaseAdapter,
})

export const getAllFictions = fictionsService.getAll
export const getFictionById = fictionsService.getById
export const createFiction = fictionsService.create
export const updateFiction = fictionsService.update
export const deleteFiction = fictionsService.delete
export const getFictionCities = fictionsService.getFictionCities

export type { Fiction } from "@/modules/fictions/fiction.domain"
export type { CreateFictionData, UpdateFictionData } from "@/modules/fictions/fiction.dtos"

const citiesService = createCitiesService({
  citiesRepo: citiesSupabaseAdapter,
})

export const getAllCities = citiesService.getAll
export const getCityById = citiesService.getById
export const createCity = citiesService.create
export const updateCity = citiesService.update
export const deleteCity = citiesService.delete
export const getCityFictions = citiesService.getCityFictions

export type { City } from "@/modules/cities/city.domain"
export type { CreateCityData, UpdateCityData } from "@/modules/cities/city.dtos"
