export interface Fiction {
  id: string
  title: string
  type: "movie" | "book" | "tv-series"
  year: number
  director?: string
  author?: string
  posterColor: string
  genre: string
  /** Poster/cover image URL (portrait, e.g. 2:3). */
  coverImage?: string
  /** Wide banner/hero image URL (e.g. 16:9). Used on fiction detail when set. */
  bannerImage?: string
  synopsis: string
}
