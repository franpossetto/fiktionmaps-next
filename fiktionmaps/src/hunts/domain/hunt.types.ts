export type HuntConfidence = "high" | "medium" | "low"
export type HuntAddressSource = "page" | "geocoded" | "knowledge" | "unknown"
export type HuntReviewDecision =
  | "approved"
  | "skipped_duplicate"
  | "skipped_low_quality"
  | "skipped_other"

export interface HuntPlace {
  name: string
  address: string
  city: string
  country: string
  description: string
  confidence: HuntConfidence
  address_source: HuntAddressSource
  is_landmark: boolean
  lat: number | null
  lng: number | null
  duplicate_of: { id: string; name: string; image: string | null } | null
  street_view_pano_id?: string | null
}

export interface HuntPlaceReviewed extends HuntPlace {
  review_decision?: HuntReviewDecision
  review_note?: string
  coords_adjusted?: { lat: number; lng: number } | null
}

/** @deprecated Use Hunt entity from hunt.entity.ts — this is kept for the legacy previewHunt action */
export interface HuntResult {
  places: HuntPlace[]
  source_url: string
  fiction_id: string
}
