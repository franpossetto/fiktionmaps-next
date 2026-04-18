import type { City } from "@/src/cities/domain/city.entity"

export type CreateCityResult =
  | { success: true; city: City }
  | { success: false; error: string }

export type UpdateCityResult =
  | { success: true; city: City }
  | { success: false; error: string }

export type DeleteCityResult =
  | { success: true }
  | { success: false; error: string }

export type FindOrCreateCityResult =
  | { success: true; city: City }
  | { success: false; error: string }
