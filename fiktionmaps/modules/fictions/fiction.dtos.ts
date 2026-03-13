export interface UpdateFictionData {
  title?: string
  type?: "movie" | "book" | "tv-series"
  year?: number
  author?: string | null
  poster_color?: string
  genre?: string
  cover_image?: string | null
  banner_image?: string | null
  description?: string
}
