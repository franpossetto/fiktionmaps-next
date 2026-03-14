export interface Fiction {
  id: string
  title: string
  type: "movie" | "book" | "tv-series"
  year: number
  author: string | null
  genre: string
  description: string
  active: boolean
  created_at: string
  updated_at: string
}
