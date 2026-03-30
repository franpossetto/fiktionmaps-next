import type { CityCheckin, PlaceCheckin } from "./checkin.domain"

export interface CheckinsRepositoryPort {
  getCityCheckins(userId: string): Promise<CityCheckin[]>
  getPlaceCheckins(userId: string): Promise<PlaceCheckin[]>
  createCityCheckin(
    userId: string,
    cityId: string,
    lat: number | null,
    lng: number | null,
    origin: "auto" | "manual",
  ): Promise<CityCheckin | null>
  createPlaceCheckin(
    userId: string,
    placeId: string,
    lat: number | null,
    lng: number | null,
    distanceM: number,
    verified: boolean,
    origin: "gps" | "manual",
  ): Promise<PlaceCheckin | null>
  hasCheckedInCity(userId: string, cityId: string): Promise<boolean>
  hasCheckedInPlace(userId: string, placeId: string): Promise<boolean>
  /** Resolve a place to its location coords + city_id for distance/city checks. */
  getPlaceLocation(placeId: string): Promise<{
    lat: number
    lng: number
    cityId: string
  } | null>
}
