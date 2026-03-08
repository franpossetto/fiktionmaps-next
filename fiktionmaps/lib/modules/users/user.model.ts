export type Interest = "adventure" | "romance" | "comedy" | "drama" | "fantasy" | "thriller" | "sci-fi" | "history"

export interface CheckIn {
  id: string
  locationId: string
  userId: string
  timestamp: Date | string
  photoUrl?: string
  caption?: string
  liked: boolean
  likeCount: number
}

export interface UserProfile {
  id: string
  username: string
  avatar: string
  bio: string
  interests: Interest[]
  joinedDate: Date | string
  visitedLocations: string[]
  checkIns: CheckIn[]
  favoriteLocations: string[]
  socialLinks?: {
    instagram?: string
    twitter?: string
  }
  stats: {
    totalVisits: number
    locationsExplored: number
    frictionsConnected: number
  }
}
