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
  slug: string
  /** Full work runtime in seconds (audiovisual). Omitted or null if unknown. */
  duration_sec?: number | null
  created_at: string
  updated_at: string
  original_language?: string | null
  content_language?: string | null
}

/** Fiction with asset_images (cover/banner URLs) joined. */
export interface FictionWithMedia extends Fiction {
  /** xs thumb when present; use for map pins / dense chips. */
  coverImageThumb?: string | null
  /** sm; lists and compact UI. */
  coverImage?: string | null
  /** Page hero cover: xl when present, else lg (map panel stays on lg via direct variant fetch). */
  coverImageLarge?: string | null
  /** Page hero banner: xl when present, else lg. */
  bannerImage?: string | null
  coverFocus?: { x: number; y: number } | null
  bannerFocus?: { x: number; y: number } | null
}

/** Staff read model: includes linked catalog ids (`fiction_external_ids`). */
export interface FictionWithMediaAndCatalogIds extends FictionWithMedia {
  catalogExternalIds: Partial<Record<string, string>>
}
