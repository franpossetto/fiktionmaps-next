/** Scene = video clip + metadata; tied to a place and fiction (audiovisual only). */
export interface Scene {
  id: string
  placeId: string
  fictionId: string
  /** Denormalized from `places.location_id` for map views. */
  locationId: string
  title: string
  description: string
  quote?: string | null
  /** Moment in the work (e.g. film timecode); maps from DB `timestamp_label`. */
  timestamp?: string | null
  season?: number | null
  episode?: number | null
  episodeTitle?: string | null
  /** Public URL of uploaded video in `asset-videos` bucket. */
  videoUrl: string | null
  sortOrder: number
  active: boolean
  /** Optional preview; may come from `asset_images` for entity_type scene. */
  thumbnail?: string | null
}
