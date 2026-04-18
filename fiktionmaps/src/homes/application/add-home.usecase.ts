import type { UserHome, CreateHomeData } from "@/src/homes/domain/home.entity"
import type { HomesRepositoryPort } from "@/src/homes/domain/home.repository"

export async function addHomeUseCase(
  userId: string,
  data: CreateHomeData,
  repo: HomesRepositoryPort
): Promise<UserHome | null> {
  await repo.closeCurrentHome(userId)
  return repo.create(userId, data)
}
