import type { UserHome } from "./home.domain"
import type { CreateHomeData } from "./home.dtos"
import type { HomesRepositoryPort } from "./home.repository.port"

interface HomesServiceDeps {
  homesRepo: HomesRepositoryPort
  getCurrentUserId: () => Promise<string | null>
}

export function createHomesService(deps: HomesServiceDeps) {
  async function getMyHomes(): Promise<UserHome[]> {
    const userId = await deps.getCurrentUserId()
    if (!userId) return []
    return deps.homesRepo.getByUserId(userId)
  }

  async function addHome(data: CreateHomeData): Promise<UserHome | null> {
    const userId = await deps.getCurrentUserId()
    if (!userId) return null
    // Close any existing current home before adding the new one
    await deps.homesRepo.closeCurrentHome(userId)
    return deps.homesRepo.create(userId, data)
  }

  async function deleteHome(homeId: string): Promise<boolean> {
    const userId = await deps.getCurrentUserId()
    if (!userId) return false
    return deps.homesRepo.delete(homeId)
  }

  return { getMyHomes, addHome, deleteHome }
}
