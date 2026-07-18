import type { StreetViewReference } from "@/src/locations/domain/location-view-reference.schemas"
import type { PlaceShootEnvironment } from "@/src/places/domain/place-shoot-environment"

export type HuntConfidence = "high" | "medium" | "low"
export type HuntAddressSource = "page" | "geocoded" | "knowledge" | "unknown"
export type HuntReviewDecision =
  | "approved"
  | "skipped_duplicate"
  | "skipped_low_quality"
  | "skipped_other"

/** Pipeline output for one candidate place (immutable snapshot after hunt creation). */
export interface HuntPlaceExtracted {
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
  street_view_reference?: StreetViewReference | null
  shoot_environment?: PlaceShootEnvironment | null
}

/** User corrections during review — sparse; only set fields differ from extracted. */
export type HuntPlaceOverrides = Partial<
  Pick<
    HuntPlaceExtracted,
    "name" | "address" | "city" | "country" | "description" | "lat" | "lng" | "street_view_reference" | "shoot_environment"
  >
>

/** Merged view of extracted + overrides (use effectivePlace() to compute). */
export interface HuntPlace extends HuntPlaceExtracted {
  /** @deprecated Superseded by street_view_reference.panoId. Kept for reading legacy payloads. */
  street_view_pano_id?: string | null
}

export interface HuntPlaceReviewed {
  extracted: HuntPlaceExtracted
  overrides?: HuntPlaceOverrides
  review_decision?: HuntReviewDecision
  review_note?: string
  /** Set when the candidate was submitted via create-place from this hunt. */
  posted_place_id?: string
}

/** @deprecated Use Hunt entity from hunt.entity.ts — this is kept for the legacy previewHunt action */
export interface HuntResult {
  places: HuntPlace[]
  source_url: string
  fiction_id: string
}
