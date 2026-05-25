import type { CityCheckin } from "@/src/checkins/domain/checkin.entity"
import type { CheckinsRepositoryPort } from "@/src/checkins/domain/checkin.repository"

export async function getLastCityCheckinUseCase(
  userId: string,
  repo: CheckinsRepositoryPort,
): Promise<CityCheckin | null> {
  return repo.getLastCityCheckin(userId)
}
