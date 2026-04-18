import { haversineDistance } from "@/lib/geo/haversine"
import type { PlaceCheckin } from "@/src/checkins/domain/checkin.entity"
import type { CheckinsRepositoryPort } from "@/src/checkins/domain/checkin.repository"

const DEFAULT_RADIUS_M = 50

export async function checkinPlaceUseCase(
  userId: string,
  placeId: string,
  lat: number,
  lng: number,
  repo: CheckinsRepositoryPort,
): Promise<PlaceCheckin | null> {
  const placeLoc = await repo.getPlaceLocation(placeId)
  if (!placeLoc) return null

  const distanceM = haversineDistance(lat, lng, placeLoc.lat, placeLoc.lng)
  const verified = distanceM <= DEFAULT_RADIUS_M
  const origin = verified ? ("gps" as const) : ("manual" as const)

  const checkin = await repo.createPlaceCheckin(userId, placeId, lat, lng, distanceM, verified, origin)
  if (!checkin) return null

  const alreadyInCity = await repo.hasCheckedInCity(userId, placeLoc.cityId)
  if (!alreadyInCity) {
    await repo.createCityCheckin(userId, placeLoc.cityId, lat, lng, "auto")
  }

  return checkin
}
