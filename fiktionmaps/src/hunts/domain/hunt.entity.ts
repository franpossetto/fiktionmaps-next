import type { HuntPlaceReviewed } from "./hunt.types"

export type HuntStatus = "draft" | "in_review" | "submitted" | "approved" | "rejected"
export type HuntOutcome = "places_created" | "partial" | "no_value" | "failed_pipeline"

export interface HuntPayload {
  places: HuntPlaceReviewed[]
}

export interface HuntStats {
  extracted: number
  approved: number
  skipped: number
  posted?: number
  llm_provider: string
  llm_model: string
  geocoder: string
}

export interface Hunt {
  id: string
  huntSourceId: string
  payload: HuntPayload
  status: HuntStatus
  outcome: HuntOutcome | null
  hunterNote: string | null
  stats: Partial<HuntStats>
  createdBy: string | null
  reviewedBy: string | null
  reviewedAt: string | null
  createdAt: string
  updatedAt: string
}
