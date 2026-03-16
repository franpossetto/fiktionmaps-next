import userProfileData from "@/data/user-profile.json"
import userContributionsData from "@/data/user-contributions.json"
import locationsData from "@/data/locations.json"
import fictionsData from "@/data/fictions.json"
import type { Location } from "@/src/locations"
import type { FictionWithMedia } from "@/src/fictions/fiction.domain"
import type { CheckIn, UserProfile } from "./user.views"

export interface UsersApiService {
  getProfile(userId: string): Promise<UserProfile | undefined>
  getContributedLocations(userId: string): Promise<Location[]>
  getContributedFictions(userId: string): Promise<FictionWithMedia[]>
  getContributedPhotos(userId: string): Promise<CheckIn[]>
}

export function createMockUsersApiService(): UsersApiService {
  const profile: UserProfile = {
    ...userProfileData,
    joinedDate: new Date((userProfileData as { joinedDate: string }).joinedDate),
    checkIns: (userProfileData as { checkIns: { timestamp: string }[] }).checkIns.map(
      (c) => ({
        ...c,
        timestamp: new Date(c.timestamp),
      }),
    ),
  } as UserProfile

  const locations = locationsData as Location[]
  const fictions = fictionsData as FictionWithMedia[]

  return {
    async getProfile(userId: string) {
      if (!userId) return undefined
      return { ...profile, id: userId }
    },
    async getContributedLocations(_userId: string) {
      const ids = (userContributionsData as { contributedLocationIds: string[] })
        .contributedLocationIds
      return locations.filter((l) => ids.includes(l.id))
    },
    async getContributedFictions(_userId: string) {
      const ids = (userContributionsData as { contributedFictionIds: string[] })
        .contributedFictionIds
      return fictions.filter((f) => ids.includes(f.id))
    },
    async getContributedPhotos(_userId: string) {
      const photos = (userContributionsData as {
        contributedPhotos: { timestamp: string }[]
      }).contributedPhotos
      return photos.map((p) => ({
        ...p,
        timestamp: new Date(p.timestamp),
      })) as CheckIn[]
    },
  }
}
