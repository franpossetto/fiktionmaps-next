import type { PlacesRepositoryPort } from "@/src/places/domain/place.repository"
import type { FictionsRepositoryPort } from "@/src/fictions/domain/fiction.repository"
import type { LLMPort } from "@/lib/ai/llm.port"
import type { HuntGeocodingPort } from "@/src/hunts/domain/geocoding.port"
import type { HuntPlace, HuntResult } from "@/src/hunts/domain/hunt.types"
import { extractPlacesFromContent } from "./extract-places-from-html"
import { enrichPlace } from "./enrich-place"
import { geocodePlace } from "./geocode-place"
import { findDuplicate } from "./find-duplicate"

const JINA_TIMEOUT_MS = 30_000

async function fetchWithJina(url: string): Promise<string> {
  const jinaUrl = `https://r.jina.ai/${url}`
  const response = await fetch(jinaUrl, {
    signal: AbortSignal.timeout(JINA_TIMEOUT_MS),
    headers: {
      Accept: "text/markdown",
    },
  })
  if (!response.ok) throw new Error(`Jina Reader failed: ${response.status}`)
  return response.text()
}

export async function previewHuntUseCase(
  source_url: string,
  fiction_id: string,
  placesRepo: PlacesRepositoryPort,
  fictionsRepo: FictionsRepositoryPort,
  llm: LLMPort,
  geocoder: HuntGeocodingPort,
): Promise<HuntResult> {
  const fiction = await fictionsRepo.getById(fiction_id)
  if (!fiction) throw new Error("Fiction not found")

  const [content, existingPlaces] = await Promise.all([
    fetchWithJina(source_url),
    placesRepo.getByFictionId(fiction_id),
  ])

  const rawPlaces = await extractPlacesFromContent(content, fiction.title, llm)

  if (rawPlaces.length === 0) {
    return { places: [], source_url, fiction_id }
  }

  // Per place, sequentially: enrich → geocode (one API call at a time) → deduplicate
  const places: HuntPlace[] = []
  for (const place of rawPlaces) {
    const enriched = await enrichPlace(place, llm)
    const geocoded = await geocodePlace(enriched, geocoder)
    const duplicate_of = findDuplicate(geocoded, existingPlaces)
    places.push({ ...geocoded, duplicate_of })
  }

  return { places, source_url, fiction_id }
}
