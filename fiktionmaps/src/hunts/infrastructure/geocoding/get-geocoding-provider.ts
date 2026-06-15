import type { HuntGeocodingPort } from "@/src/hunts/domain/geocoding.port"
import { CompositeGeocodingProvider } from "./composite-geocoding.provider"
import { GoogleGeocodingProvider } from "./google-geocoding.provider"
import { MapboxGeocodingProvider } from "./mapbox-geocoding.provider"

export type HuntGeocodingProviderName = "mapbox" | "google" | "mapbox-google"

export function getGeocodingProvider(
  name: HuntGeocodingProviderName = resolveProviderName(),
): HuntGeocodingPort {
  switch (name) {
    case "google":
      return new GoogleGeocodingProvider()
    case "mapbox-google":
      return new CompositeGeocodingProvider(
        new MapboxGeocodingProvider(),
        new GoogleGeocodingProvider(),
      )
    case "mapbox":
    default:
      return new MapboxGeocodingProvider()
  }
}

function resolveProviderName(): HuntGeocodingProviderName {
  const raw = process.env.HUNT_GEOCODING_PROVIDER?.trim().toLowerCase()
  if (raw === "google" || raw === "mapbox" || raw === "mapbox-google") return raw
  return "mapbox-google"
}
