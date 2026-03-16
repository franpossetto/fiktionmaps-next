export interface Scene {
  id: string
  locationId: string
  fictionId: string
  title: string
  description: string
  season?: number
  episode?: number
  episodeTitle?: string
  chapter?: string
  timestamp?: string
  videoUrl: string
  thumbnail: string
  quote?: string
}
