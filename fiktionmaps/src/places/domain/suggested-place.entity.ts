/** Public catalog card for wishlist empty-state suggestions. */
export interface SuggestedPlace {
  placeId: string
  placeSlug: string
  placeName: string
  placeImage: string | null
  fictionId: string
  fictionSlug: string
  fictionTitle: string
  cityName: string | null
}
