import { importLibrary, setOptions } from "@googlemaps/js-api-loader"

let loadPromise: Promise<typeof google> | null = null

function getApiKey(): string {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim()
  if (!key) {
    throw new Error("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not configured")
  }
  return key
}

export function loadGoogleMaps(): Promise<typeof google> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Maps can only be loaded in the browser"))
  }
  if (!loadPromise) {
    setOptions({
      key: getApiKey(),
      v: "weekly",
    })
    loadPromise = Promise.all([
      importLibrary("maps"),
      importLibrary("streetView"),
    ]).then(() => google)
  }
  return loadPromise
}

export function isGoogleMapsConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim())
}
