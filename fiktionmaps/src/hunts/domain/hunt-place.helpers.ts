import type { StreetViewReference } from "@/src/locations/domain/location-view-reference.schemas"
import type {
  HuntPlace,
  HuntPlaceExtracted,
  HuntPlaceOverrides,
  HuntPlaceReviewed,
  HuntReviewDecision,
} from "./hunt.types"
import type { HuntPayload } from "./hunt.entity"
import { parsePlaceShootEnvironment } from "@/src/places/domain/place-shoot-environment"

const OVERRIDE_KEYS = [
  "name",
  "address",
  "city",
  "country",
  "description",
  "lat",
  "lng",
  "street_view_reference",
  "shoot_environment",
] as const satisfies readonly (keyof HuntPlaceOverrides)[]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function pickExtracted(raw: Record<string, unknown>): HuntPlaceExtracted {
  return {
    name: String(raw.name ?? ""),
    address: String(raw.address ?? ""),
    city: String(raw.city ?? ""),
    country: String(raw.country ?? ""),
    description: String(raw.description ?? ""),
    confidence: (raw.confidence as HuntPlaceExtracted["confidence"]) ?? "low",
    address_source: (raw.address_source as HuntPlaceExtracted["address_source"]) ?? "unknown",
    is_landmark: Boolean(raw.is_landmark),
    lat: typeof raw.lat === "number" ? raw.lat : null,
    lng: typeof raw.lng === "number" ? raw.lng : null,
    duplicate_of: (raw.duplicate_of as HuntPlaceExtracted["duplicate_of"]) ?? null,
    street_view_reference:
      (raw.street_view_reference as StreetViewReference | null | undefined) ?? null,
    shoot_environment: parsePlaceShootEnvironment(raw.shoot_environment),
  }
}

function cleanOverrides(
  extracted: HuntPlaceExtracted,
  overrides: HuntPlaceOverrides,
): HuntPlaceOverrides | undefined {
  const cleaned: HuntPlaceOverrides = {}
  for (const key of OVERRIDE_KEYS) {
    const value = overrides[key]
    if (value === undefined) continue
    if (key === "street_view_reference") {
      if (value !== extracted.street_view_reference) {
        cleaned.street_view_reference = value as StreetViewReference | null
      }
      continue
    }
    if (key === "shoot_environment") {
      if (value !== extracted.shoot_environment) {
        cleaned.shoot_environment = value as HuntPlaceExtracted["shoot_environment"]
      }
      continue
    }
    if (value !== extracted[key]) {
      ;(cleaned as Record<string, unknown>)[key] = value
    }
  }
  return Object.keys(cleaned).length > 0 ? cleaned : undefined
}

/** Merged place values used for display and moderation. */
export function effectivePlace(reviewed: HuntPlaceReviewed): HuntPlace {
  return { ...reviewed.extracted, ...reviewed.overrides }
}

export function effectiveStreetViewReference(
  reviewed: HuntPlaceReviewed,
): StreetViewReference | null | undefined {
  if (reviewed.overrides && "street_view_reference" in reviewed.overrides) {
    return reviewed.overrides.street_view_reference ?? null
  }
  return reviewed.extracted.street_view_reference
}

export function isCoordsOverridden(reviewed: HuntPlaceReviewed): boolean {
  const { overrides, extracted } = reviewed
  if (!overrides) return false
  if (overrides.lat !== undefined && overrides.lat !== extracted.lat) return true
  if (overrides.lng !== undefined && overrides.lng !== extracted.lng) return true
  return false
}

export function isNameOverridden(reviewed: HuntPlaceReviewed): boolean {
  const { overrides, extracted } = reviewed
  if (!overrides) return false
  return overrides.name !== undefined && overrides.name !== extracted.name
}

export function isAddressOverridden(reviewed: HuntPlaceReviewed): boolean {
  const { overrides, extracted } = reviewed
  if (!overrides) return false
  if (overrides.address !== undefined && overrides.address !== extracted.address) return true
  if (overrides.city !== undefined && overrides.city !== extracted.city) return true
  if (overrides.country !== undefined && overrides.country !== extracted.country) return true
  return false
}

export function isStreetViewOverridden(reviewed: HuntPlaceReviewed): boolean {
  return reviewed.overrides?.street_view_reference !== undefined
}

export function isShootEnvironmentOverridden(reviewed: HuntPlaceReviewed): boolean {
  const { overrides, extracted } = reviewed
  if (!overrides) return false
  return (
    overrides.shoot_environment !== undefined &&
    overrides.shoot_environment !== extracted.shoot_environment
  )
}

export function hasAnyOverrides(reviewed: HuntPlaceReviewed): boolean {
  return Boolean(reviewed.overrides && Object.keys(reviewed.overrides).length > 0)
}

export function toReviewedPlace(extracted: HuntPlace): HuntPlaceReviewed {
  const { street_view_pano_id: _deprecated, ...rest } = extracted
  return { extracted: rest, overrides: undefined }
}

export function setPlaceOverrides(
  reviewed: HuntPlaceReviewed,
  patch: HuntPlaceOverrides,
): HuntPlaceReviewed {
  const merged = { ...reviewed.overrides, ...patch }
  return {
    ...reviewed,
    overrides: cleanOverrides(reviewed.extracted, merged),
  }
}

export function clearPlaceOverrides(
  reviewed: HuntPlaceReviewed,
  keys: (keyof HuntPlaceOverrides)[],
): HuntPlaceReviewed {
  if (!reviewed.overrides) return reviewed
  const next = { ...reviewed.overrides }
  for (const key of keys) {
    delete next[key]
  }
  return {
    ...reviewed,
    overrides: cleanOverrides(reviewed.extracted, next),
  }
}

export function clearAllPlaceOverrides(reviewed: HuntPlaceReviewed): HuntPlaceReviewed {
  return { ...reviewed, overrides: undefined }
}

/**
 * Normalizes a stored place into extracted + overrides.
 * Legacy flat payloads (pre extracted/overrides) are treated as extracted-only.
 * Remove this branch once old hunt rows are gone.
 */
export function normalizeHuntPlace(raw: unknown): HuntPlaceReviewed {
  if (!isRecord(raw)) {
    throw new Error("Invalid hunt place payload")
  }

  if (isRecord(raw.extracted)) {
    return {
      extracted: pickExtracted(raw.extracted),
      overrides: isRecord(raw.overrides)
        ? cleanOverrides(pickExtracted(raw.extracted), raw.overrides as HuntPlaceOverrides)
        : undefined,
      review_decision: raw.review_decision as HuntReviewDecision | undefined,
      review_note: typeof raw.review_note === "string" ? raw.review_note : undefined,
      posted_place_id: typeof raw.posted_place_id === "string" ? raw.posted_place_id : undefined,
    }
  }

  const extracted = pickExtracted(raw)
  return {
    extracted,
    overrides: undefined,
    review_decision: raw.review_decision as HuntReviewDecision | undefined,
    review_note: typeof raw.review_note === "string" ? raw.review_note : undefined,
    posted_place_id: typeof raw.posted_place_id === "string" ? raw.posted_place_id : undefined,
  }
}

export function normalizeHuntPayload(payload: unknown): HuntPayload {
  if (!isRecord(payload)) {
    return { places: [] }
  }
  const places = Array.isArray(payload.places) ? payload.places.map(normalizeHuntPlace) : []
  return { places }
}

export function huntPlaceFromExtracted(extracted: HuntPlaceExtracted): HuntPlaceReviewed {
  return { extracted, overrides: undefined }
}
