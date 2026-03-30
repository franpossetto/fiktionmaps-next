import { haversineDistance } from "@/lib/geo/haversine"
import type { CityCheckin, PlaceCheckin } from "./checkin.domain"
import type { PlaceCheckinResult } from "./checkin.dtos"
import type { CheckinsRepositoryPort } from "./checkin.repository.port"

const DEFAULT_RADIUS_M = 50

interface CheckinsServiceDeps {
  checkinsRepo: CheckinsRepositoryPort
  getCurrentUserId: () => Promise<string | null>
}

export function createCheckinsService(deps: CheckinsServiceDeps) {
  async function checkinCity(
    cityId: string,
    lat: number | null,
    lng: number | null,
    origin: "auto" | "manual",
  ): Promise<CityCheckin | null> {
    const userId = await deps.getCurrentUserId()
    if (!userId) return null
    return deps.checkinsRepo.createCityCheckin(userId, cityId, lat, lng, origin)
  }

  async function checkinPlace(
    placeId: string,
    lat: number,
    lng: number,
  ): Promise<PlaceCheckinResult | null> {
    const userId = await deps.getCurrentUserId()
    if (!userId) return null

    const placeLoc = await deps.checkinsRepo.getPlaceLocation(placeId)
    if (!placeLoc) return null

    const distanceM = haversineDistance(lat, lng, placeLoc.lat, placeLoc.lng)
    const verified = distanceM <= DEFAULT_RADIUS_M
    const origin = verified ? ("gps" as const) : ("manual" as const)

    const checkin = await deps.checkinsRepo.createPlaceCheckin(
      userId,
      placeId,
      lat,
      lng,
      distanceM,
      verified,
      origin,
    )
    if (!checkin) return null

    // Auto-create city checkin if user hasn't checked into this city yet
    const alreadyInCity = await deps.checkinsRepo.hasCheckedInCity(
      userId,
      placeLoc.cityId,
    )
    if (!alreadyInCity) {
      await deps.checkinsRepo.createCityCheckin(
        userId,
        placeLoc.cityId,
        lat,
        lng,
        "auto",
      )
    }

    return {
      id: checkin.id,
      placeId: checkin.placeId,
      verified,
      distanceM: Math.round(distanceM),
      origin,
    }
  }

  async function getMyCityCheckins(): Promise<CityCheckin[]> {
    const userId = await deps.getCurrentUserId()
    if (!userId) return []
    return deps.checkinsRepo.getCityCheckins(userId)
  }

  async function getMyPlaceCheckins(): Promise<PlaceCheckin[]> {
    const userId = await deps.getCurrentUserId()
    if (!userId) return []
    return deps.checkinsRepo.getPlaceCheckins(userId)
  }

  return { checkinCity, checkinPlace, getMyCityCheckins, getMyPlaceCheckins }
}
