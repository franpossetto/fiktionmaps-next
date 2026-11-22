import type { Fiction } from "@/src/fictions/domain/fiction.entity"
import type { FictionsRepositoryPort } from "@/src/fictions/domain/fiction.repository"
import type { PlacesRepositoryPort } from "@/src/places/domain/place.repository"
import {
  PUBLIC_CATALOG_SEARCH_LIMIT,
  type PublicCatalogFictionHit,
  type PublicCatalogPlaceHit,
  type PublicCatalogPlaceMatch,
  type PublicCatalogSearchHit,
} from "@/src/places/domain/public-catalog-search"

export type SearchPublicCatalogDeps = {
  places: Pick<PlacesRepositoryPort, "searchApprovedActiveByName" | "searchApprovedActiveByCityName">
  fictions: Pick<FictionsRepositoryPort, "searchApprovedActiveByTitle">
}

function placeHit(place: PublicCatalogPlaceMatch, match: PublicCatalogPlaceHit["match"]): PublicCatalogPlaceHit {
  return { kind: "place", match, ...place }
}

function fictionHitFromFiction(fiction: Fiction): PublicCatalogFictionHit {
  return {
    kind: "fiction",
    match: "fiction_title",
    fictionId: fiction.id,
    title: fiction.title,
    slug: fiction.slug,
    year: fiction.year,
    type: fiction.type,
    description: fiction.description,
    cityName: null,
    country: null,
  }
}

function fictionHitFromCityPlace(place: PublicCatalogPlaceMatch): PublicCatalogFictionHit {
  return {
    kind: "fiction",
    match: "city",
    fictionId: place.fictionId,
    title: place.fictionTitle,
    slug: place.fictionSlug,
    year: place.fictionYear,
    type: place.fictionType,
    description: place.fictionDescription,
    cityName: place.cityName,
    country: place.country,
  }
}

/**
 * Three capped queries, then one global cap.
 * Rank: place name, fiction title, then city (published fiction, then its visible places).
 */
export async function searchPublicCatalogUseCase(
  query: string,
  deps: SearchPublicCatalogDeps,
): Promise<PublicCatalogSearchHit[]> {
  const trimmed = query.trim()
  if (!trimmed) return []

  const [byPlaceName, byTitle, byCity] = await Promise.all([
    deps.places.searchApprovedActiveByName(trimmed, PUBLIC_CATALOG_SEARCH_LIMIT),
    deps.fictions.searchApprovedActiveByTitle(trimmed, PUBLIC_CATALOG_SEARCH_LIMIT),
    deps.places.searchApprovedActiveByCityName(trimmed, PUBLIC_CATALOG_SEARCH_LIMIT),
  ])

  const seenPlaces = new Set<string>()
  const seenFictions = new Set<string>()
  const ranked: PublicCatalogSearchHit[] = []

  for (const place of byPlaceName) {
    if (seenPlaces.has(place.placeId)) continue
    seenPlaces.add(place.placeId)
    ranked.push(placeHit(place, "place_name"))
  }

  for (const fiction of byTitle) {
    if (seenFictions.has(fiction.id)) continue
    seenFictions.add(fiction.id)
    ranked.push(fictionHitFromFiction(fiction))
  }

  for (const place of byCity) {
    if (seenFictions.has(place.fictionId)) continue
    seenFictions.add(place.fictionId)
    ranked.push(fictionHitFromCityPlace(place))
  }

  for (const place of byCity) {
    if (seenPlaces.has(place.placeId)) continue
    seenPlaces.add(place.placeId)
    ranked.push(placeHit(place, "city"))
  }

  return ranked.slice(0, PUBLIC_CATALOG_SEARCH_LIMIT)
}
