import type { CityCheckin } from "@/src/checkins/domain/checkin.entity"
import type { CheckinsRepositoryPort } from "@/src/checkins/domain/checkin.repository"

export async function listMyCityCheckinsUseCase(
  userId: string,
  repo: CheckinsRepositoryPort,
): Promise<CityCheckin[]> {
  return repo.getCityCheckins(userId)
}
