/** Pure domain = table fictions (no media). */
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

/** Fiction with asset_images (cover/banner URLs) joined. */
export interface FictionWithMedia extends Fiction {
  coverImage?: string | null
  coverImageLarge?: string | null
  bannerImage?: string | null
}
