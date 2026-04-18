import type { EnrichedPlaceCheckin } from "@/src/checkins/domain/checkin.entity"
import type { CheckinsRepositoryPort } from "@/src/checkins/domain/checkin.repository"

export async function loadEnrichedPlaceCheckinsUseCase(
  userId: string,
  repo: CheckinsRepositoryPort,
): Promise<EnrichedPlaceCheckin[]> {
  return repo.getEnrichedPlaceCheckinsForUser(userId)
}
