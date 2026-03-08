import type { Fiction } from "@/lib/modules/fictions/fiction.model"
import type { Location } from "@/lib/modules/locations/location.model"
import type { CheckIn, UserProfile } from "./user.model"
import type { IUserRepository } from "./user.repository"

export class UserService {
  constructor(private userRepo: IUserRepository) {}

  async getProfile(userId: string): Promise<UserProfile | undefined> {
    return this.userRepo.getProfile(userId)
  }

  async getContributedLocations(userId: string): Promise<Location[]> {
    return this.userRepo.getContributedLocations(userId)
  }

  async getContributedFictions(userId: string): Promise<Fiction[]> {
    return this.userRepo.getContributedFictions(userId)
  }

  async getContributedPhotos(userId: string): Promise<CheckIn[]> {
    return this.userRepo.getContributedPhotos(userId)
  }
}
