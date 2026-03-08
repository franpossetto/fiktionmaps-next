import userProfileData from "@/data/user-profile.json"
import userContributionsData from "@/data/user-contributions.json"
import locationsData from "@/data/locations.json"
import fictionsData from "@/data/fictions.json"
import type { Fiction } from "@/lib/modules/fictions/fiction.model"
import type { Location } from "@/lib/modules/locations/location.model"
import type { CheckIn, UserProfile } from "./user.model"
import type { IUserRepository } from "./user.repository"

export class MockUserRepository implements IUserRepository {
  private profile: UserProfile = {
    ...userProfileData,
    joinedDate: new Date(userProfileData.joinedDate),
    checkIns: userProfileData.checkIns.map((c) => ({
      ...c,
      timestamp: new Date(c.timestamp),
    })),
  } as UserProfile

  private locations: Location[] = locationsData as Location[]
  private fictions: Fiction[] = fictionsData as Fiction[]

  async getProfile(userId: string): Promise<UserProfile | undefined> {
    if (!userId) return undefined
    // In mock mode, any logged-in user sees the sample profile (auth uses random ids like "user-xyz")
    return { ...this.profile, id: userId }
  }

  async getContributedLocations(_userId: string): Promise<Location[]> {
    const ids = userContributionsData.contributedLocationIds
    return this.locations.filter((l) => ids.includes(l.id))
  }

  async getContributedFictions(_userId: string): Promise<Fiction[]> {
    const ids = userContributionsData.contributedFictionIds
    return this.fictions.filter((f) => ids.includes(f.id))
  }

  async getContributedPhotos(_userId: string): Promise<CheckIn[]> {
    return userContributionsData.contributedPhotos.map((p) => ({
      ...p,
      timestamp: new Date(p.timestamp),
    })) as CheckIn[]
  }
}
