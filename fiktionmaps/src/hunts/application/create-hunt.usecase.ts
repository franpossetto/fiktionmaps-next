import type { HuntSourcesRepositoryPort } from "@/src/hunts/domain/hunt-source.repository"
import type { HuntsRepositoryPort } from "@/src/hunts/domain/hunt.repository"
import type { PlacesRepositoryPort } from "@/src/places/domain/place.repository"
import type { FictionsRepositoryPort } from "@/src/fictions/domain/fiction.repository"
import type { LLMPort } from "@/lib/ai/llm.port"
import type { HuntGeocodingPort } from "@/src/hunts/domain/geocoding.port"
import type { Hunt } from "@/src/hunts/domain/hunt.entity"
import type { HuntPlaceReviewed } from "@/src/hunts/domain/hunt.types"
import { toReviewedPlace } from "@/src/hunts/domain/hunt-place.helpers"
import { extractPlacesFromContent } from "./extract-places-from-html"
import { enrichPlace } from "./enrich-place"
import { geocodePlace } from "./geocode-place"
import { findDuplicate } from "./find-duplicate"

export async function createHuntUseCase(
  sourceId: string,
  userId: string,
  huntSourcesRepo: HuntSourcesRepositoryPort,
  huntsRepo: HuntsRepositoryPort,
  placesRepo: PlacesRepositoryPort,
  fictionsRepo: FictionsRepositoryPort,
  llm: LLMPort,
  geocoder: HuntGeocodingPort,
): Promise<Hunt> {
  const source = await huntSourcesRepo.getById(sourceId)
  if (!source) throw new Error("Hunt source not found")
  if (source.createdBy !== userId) throw new Error("Forbidden")

  if (source.scrapeStatus !== "ok" || !source.scrapedMarkdown) {
    throw new Error("Source has not been scraped yet — scrape it first")
  }

  // Resolve fiction title for extraction prompt
  let fictionTitle = source.contextLabel ?? "Unknown"
  let existingPlaces: Awaited<ReturnType<PlacesRepositoryPort["getByFictionId"]>> = []

  if (source.fictionId) {
    const fiction = await fictionsRepo.getById(source.fictionId)
    if (!fiction) throw new Error("Fiction not found")
    fictionTitle = fiction.title
    existingPlaces = await placesRepo.getByFictionId(source.fictionId)
  }

  const rawPlaces = await extractPlacesFromContent(source.scrapedMarkdown, fictionTitle, llm)

  const places: HuntPlaceReviewed[] = []
  for (const place of rawPlaces) {
    const enriched = await enrichPlace(place, llm)
    const geocoded = await geocodePlace(enriched, geocoder)
    const duplicate_of = findDuplicate(geocoded, existingPlaces)
    places.push(toReviewedPlace({ ...geocoded, duplicate_of }))
  }

  const hunt = await huntsRepo.create({
    huntSourceId: sourceId,
    payload: { places },
    createdBy: userId,
    stats: {
      extracted: places.length,
      approved: 0,
      skipped: 0,
      llm_provider: llm.name,
      llm_model: llm.model,
      geocoder: geocoder.name,
    },
  })

  if (!hunt) throw new Error("Failed to create hunt")

  return hunt
}
