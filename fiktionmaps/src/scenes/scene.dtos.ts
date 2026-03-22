/** Payload to create a scene (API / service). */
export interface CreateSceneData {
  fictionId: string
  placeId: string
  title: string
  description: string
  quote?: string | null
  timestampLabel?: string | null
  season?: number | null
  episode?: number | null
  episodeTitle?: string | null
  videoUrl?: string | null
  sortOrder?: number
  active?: boolean
}

export type UpdateSceneData = Partial<CreateSceneData>
