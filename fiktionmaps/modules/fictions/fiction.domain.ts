export interface Fiction {
  id: string
  title: string
  type: "movie" | "book" | "tv-series"
  year: number
  author: string | null
  poster_color: string
  genre: string
  cover_image: string | null
  banner_image: string | null
  description: string
  created_at: string
  updated_at: string
}
