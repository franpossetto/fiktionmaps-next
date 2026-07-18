import type { City } from "@/src/cities/domain/city.entity"
import type { StreetViewReference } from "@/src/locations/domain/location-view-reference.schemas"
import type { PlaceShootEnvironment } from "@/src/places/domain/place-shoot-environment"
import { effectivePlace } from "./hunt-place.helpers"
import type { HuntPlace, HuntPlaceReviewed } from "./hunt.types"

export interface HuntPlaceContributePrefill {
  huntId: string
  placeIndex: number
  fictionId: string
  cityId: string
  locationName: string
  placeName: string
  formattedAddress: string
  latitude: number
  longitude: number
  description: string
  isLandmark: boolean
  shootEnvironment: PlaceShootEnvironment | null
  streetViewReference: StreetViewReference | null
}

export function formatHuntPlaceAddress(place: HuntPlace): string {
  return [place.address, place.city, place.country].filter(Boolean).join(", ")
}

export function resolveCityIdFromHuntPlace(place: HuntPlace, cities: City[]): string {
  const cityName = place.city.trim()
  const country = place.country.trim()
  if (!cityName && !country) return cities[0]?.id ?? ""

  for (const city of cities) {
    if (country && city.country !== country) continue
    if (cityName && city.name === cityName) return city.id
    if (cityName && cityName.toLowerCase().includes(city.name.toLowerCase())) return city.id
    if (cityName && city.name.toLowerCase().includes(cityName.toLowerCase())) return city.id
  }

  if (country) {
    const byCountry = cities.find((c) => c.country === country)
    if (byCountry) return byCountry.id
  }

  return cities[0]?.id ?? ""
}

export function isCandidateShortlisted(reviewed: HuntPlaceReviewed): boolean {
  return reviewed.review_decision === "approved"
}

export function isCandidatePosted(reviewed: HuntPlaceReviewed): boolean {
  return Boolean(reviewed.posted_place_id)
}

export function isCandidateSkipped(reviewed: HuntPlaceReviewed): boolean {
  return Boolean(reviewed.review_decision && reviewed.review_decision !== "approved")
}

export function canPostulateCandidate(reviewed: HuntPlaceReviewed): boolean {
  if (!isCandidateShortlisted(reviewed) || isCandidatePosted(reviewed)) return false
  const place = effectivePlace(reviewed)
  return place.lat != null && place.lng != null
}

export function countHuntCandidateStats(places: HuntPlaceReviewed[]): {
  extracted: number
  shortlisted: number
  skipped: number
  posted: number
} {
  return {
    extracted: places.length,
    shortlisted: places.filter(isCandidateShortlisted).length,
    skipped: places.filter(isCandidateSkipped).length,
    posted: places.filter(isCandidatePosted).length,
  }
}

export function buildHuntPlaceContributePrefill(
  huntId: string,
  placeIndex: number,
  reviewed: HuntPlaceReviewed,
  fictionId: string,
  cities: City[],
): HuntPlaceContributePrefill | null {
  if (!canPostulateCandidate(reviewed)) return null

  const place = effectivePlace(reviewed)
  if (place.lat == null || place.lng == null) return null

  const formattedAddress = formatHuntPlaceAddress(place)
  const locationName =
    place.address.trim() ||
    formattedAddress.split(",")[0]?.trim() ||
    place.name.trim() ||
    "Location"

  return {
    huntId,
    placeIndex,
    fictionId,
    cityId: resolveCityIdFromHuntPlace(place, cities),
    locationName,
    placeName: place.name.trim() || locationName,
    formattedAddress: formattedAddress || locationName,
    latitude: place.lat,
    longitude: place.lng,
    description: place.description.trim() || place.name.trim() || locationName,
    isLandmark: place.is_landmark,
    shootEnvironment: place.shoot_environment ?? null,
    streetViewReference:
      reviewed.overrides && "street_view_reference" in reviewed.overrides
        ? (reviewed.overrides.street_view_reference ?? null)
        : (place.street_view_reference ?? null),
  }
}
