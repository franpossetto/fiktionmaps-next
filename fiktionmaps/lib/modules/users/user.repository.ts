import type { Fiction } from "@/lib/modules/fictions/fiction.model"
import type { Location } from "@/lib/modules/locations/location.model"
import type { CheckIn, UserProfile } from "./user.model"

export interface IUserRepository {
  getProfile(userId: string): Promise<UserProfile | undefined>
  getContributedLocations(userId: string): Promise<Location[]>
  getContributedFictions(userId: string): Promise<Fiction[]>
  getContributedPhotos(userId: string): Promise<CheckIn[]>
}
