import type { HuntGeocodingPort } from "@/src/hunts/domain/geocoding.port"
import type { HuntPlace } from "@/src/hunts/domain/hunt.types"

export function buildGeocodeQuery(place: HuntPlace): string {
  const parts = place.address.trim()
    ? [place.address, place.city, place.country]
    : [place.name, place.city, place.country]
  return parts.filter(Boolean).join(", ")
}

export async function geocodePlace(
  place: HuntPlace,
  geocoder: HuntGeocodingPort,
): Promise<HuntPlace> {
  const query = buildGeocodeQuery(place)
  if (!query) return place

  const result = await geocoder.geocode(query)
  if (!result) return place

  const hadPageAddress = Boolean(place.address.trim())

  return {
    ...place,
    address: hadPageAddress ? place.address : result.formattedAddress,
    lat: result.lat,
    lng: result.lng,
    address_source: hadPageAddress ? "page" : "geocoded",
  }
}
