export interface Fiction {
  id: string
  title: string
  type: "movie" | "book" | "tv-series"
  year: number
  director?: string
  author?: string
  genre: string
  /** Optional; not stored until storage buckets exist. UI uses placeholder when absent. */
  coverImage?: string
  /** Optional; not stored until storage buckets exist. */
  bannerImage?: string
  synopsis: string
}
