import type { CityCheckin } from "@/src/checkins/domain/checkin.entity"
import type { CheckinsRepositoryPort } from "@/src/checkins/domain/checkin.repository"

export async function checkinCityUseCase(
  userId: string,
  cityId: string,
  lat: number | null,
  lng: number | null,
  origin: "auto" | "manual",
  repo: CheckinsRepositoryPort,
): Promise<CityCheckin | null> {
  return repo.createCityCheckin(userId, cityId, lat, lng, origin)
}
