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
  /** Profile id of the user who created this fiction (omitted or null on legacy rows). */
  created_by?: string | null
  slug: string | null
  /** Full work runtime in seconds (audiovisual). Omitted or null if unknown. */
  duration_sec?: number | null
  created_at: string
  updated_at: string
}

/** Fiction with asset_images (cover/banner URLs) joined. */
export interface FictionWithMedia extends Fiction {
  coverImage?: string | null
  coverImageLarge?: string | null
  bannerImage?: string | null
}

/** Staff read model: includes linked catalog ids (`fiction_external_ids`). */
export interface FictionWithMediaAndCatalogIds extends FictionWithMedia {
  catalogExternalIds: Partial<Record<string, string>>
}
