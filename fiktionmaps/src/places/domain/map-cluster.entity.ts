/** Cover thumbs shown on a world cluster pin (max 5). */
export type MapClusterFictionCover = {
  fictionId: string
  imageUrl: string
  /** Display title for hover / selection affordance. */
  title: string | null
}

/** Server/client grid aggregate for free-world map (LOD / discovery). */
export type MapCluster = {
  id: string
  lat: number
  lng: number
  /** Place count in this bucket. */
  count: number
  /** Distinct cities represented in this bucket. */
  cityCount: number
  /** City that owns the plurality of places (if known). */
  dominantCityId: string | null
  /** Share of places belonging to dominantCityId (0–1). */
  dominantShare: number
  /** Distinct fictions in the bucket (for +N when > covers shown). */
  fictionTotal: number
  /** Up to 5 fiction covers to stack on the pin. */
  fictionCovers: MapClusterFictionCover[]
}
