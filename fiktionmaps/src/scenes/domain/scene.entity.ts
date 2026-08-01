/** One place a scene passes through, with its window inside the scene's video. */
export interface ScenePlace {
  placeId: string
  /** Denormalized from `places.location_id` for map views. */
  locationId: string
  sortOrder: number
  /** Playback position (seconds) where the place first appears. Null = unknown. */
  startSecond: number | null
  /** Playback position (seconds) where the place stops appearing. Null = unknown. */
  endSecond: number | null
}

/** Scene = video clip + metadata; tied to one fiction and to N places (audiovisual only). */
export interface Scene {
  id: string
  fictionId: string
  /** Ordered by `sortOrder`, then link creation. Empty only for a scene with no links yet. */
  places: ScenePlace[]
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
  /** Public URL of low-res muted preview MP4; null for legacy rows. */
  previewUrl: string | null
  sortOrder: number
  active: boolean
  /** Optional preview; may come from `asset_images` for entity_type scene. */
  thumbnail?: string | null
}

/** Read model: recent scenes the user created, for profile sidebar. */
export type ProfileScenePreview = {
  id: string
  fictionId: string
  fictionSlug?: string | null
  title: string
  fictionTitle: string
  imageUrl: string | null
}
