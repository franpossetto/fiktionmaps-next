import type { UserHome } from "./home.domain"
import type { CreateHomeData, UpdateHomeData } from "./home.dtos"

export interface HomesRepositoryPort {
  getByUserId(userId: string): Promise<UserHome[]>
  create(userId: string, data: CreateHomeData): Promise<UserHome | null>
  update(id: string, data: UpdateHomeData): Promise<UserHome | null>
  delete(id: string): Promise<boolean>
  /** Close the current home (date_to IS NULL) by setting date_to = today. */
  closeCurrentHome(userId: string): Promise<void>
}
