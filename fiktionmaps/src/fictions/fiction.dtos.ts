/** Data required to create a new fiction (id, created_at, updated_at are set by DB). */
export interface CreateFictionData {
  title: string
  type: "movie" | "book" | "tv-series"
  year: number
  author?: string | null
  genre: string
  description: string
  /** Default true: visible in search. */
  active?: boolean
}

export interface UpdateFictionData {
  title?: string
  type?: "movie" | "book" | "tv-series"
  year?: number
  author?: string | null
  genre?: string
  description?: string
  active?: boolean
}
