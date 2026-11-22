import { z } from "zod"
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { getCityByIdUseCase } from "@/src/cities/application/get-city-by-id.usecase"
import { getFictionPlacesUseCase } from "@/src/places/application/get-fiction-places.usecase"
import { resolvePlaceForFictionPathUseCase } from "@/src/places/application/resolve-place-for-fiction-path.usecase"
import { searchPublicCatalogUseCase } from "@/src/places/application/search-public-catalog.usecase"
import { getPublicFictionBySlugUseCase } from "@/src/fictions/application/get-public-fiction-by-slug.usecase"
import type { Place } from "@/src/places/domain/place.entity"
import type { PublicCatalogSearchHit } from "@/src/places/domain/public-catalog-search"
import {
  citiesRepoPublic,
  fictionsRepoPublic,
  placesRepoPublic,
} from "@/src/shared/infrastructure/supabase/anon-repos"
import { briefText, catalogToolResult } from "@/src/mcp/catalog-tool-result"
import { fictionCatalogUrl, placeCatalogUrl } from "@/src/mcp/catalog-urls"

export const SEARCH_CATALOG_TOOL = "search_catalog"
export const LIST_FICTION_PLACES_TOOL = "list_fiction_places"
export const GET_PLACE_TOOL = "get_place"

function searchHitJson(hit: PublicCatalogSearchHit) {
  if (hit.kind === "place") {
    return {
      kind: hit.kind,
      match: hit.match,
      name: hit.placeName,
      slug: hit.placeSlug,
      description: briefText(hit.description),
      city: hit.cityName,
      country: hit.country,
      lat: hit.lat,
      lng: hit.lng,
      fictionTitle: hit.fictionTitle,
      fictionSlug: hit.fictionSlug,
      url: placeCatalogUrl(hit.fictionSlug, hit.placeSlug),
    }
  }
  return {
    kind: hit.kind,
    match: hit.match,
    title: hit.title,
    slug: hit.slug,
    type: hit.type,
    year: hit.year,
    description: briefText(hit.description),
    city: hit.cityName,
    country: hit.country,
    url: fictionCatalogUrl(hit.slug),
  }
}

async function cityFields(cityId: string): Promise<{ city: string; country: string } | null> {
  if (!cityId) return null
  const city = await getCityByIdUseCase(cityId, citiesRepoPublic)
  if (!city) return null
  return { city: city.name, country: city.country }
}

function placeJson(
  place: Place,
  fictionSlug: string,
  city: { city: string; country: string } | null,
) {
  return {
    name: place.name,
    slug: place.slug,
    description: briefText(place.description),
    city: city?.city ?? null,
    country: city?.country ?? null,
    lat: place.location.lat,
    lng: place.location.lng,
    url: placeCatalogUrl(fictionSlug, place.slug),
  }
}

export function registerPlaceCatalogTools(server: McpServer): void {
  server.registerTool(
    SEARCH_CATALOG_TOOL,
    {
      title: "Search the published catalog",
      description:
        "Search published FiktionMaps fictions and visible places by place name, fiction title, or city name. A city match returns the published fictions and visible places in that city, never the city by itself. At most 20 results, ranked place name, then fiction title, then city.",
      inputSchema: {
        query: z
          .string()
          .trim()
          .min(1)
          .describe("Place name, fiction title, or city. Example: Empire State Building"),
      },
    },
    async ({ query }) => {
      const hits = await searchPublicCatalogUseCase(query, {
        places: placesRepoPublic,
        fictions: fictionsRepoPublic,
      })
      return catalogToolResult({ results: hits.map(searchHitJson) })
    },
  )

  server.registerTool(
    LIST_FICTION_PLACES_TOOL,
    {
      title: "List visible places for a fiction",
      description:
        "List approved, active places for one published fiction. Returns nothing when the fiction is missing, inactive, or not approved.",
      inputSchema: {
        fictionSlug: z.string().trim().min(1).describe("Fiction slug from search_catalog or get_fiction"),
      },
    },
    async ({ fictionSlug }) => {
      const fiction = await getPublicFictionBySlugUseCase(fictionSlug, fictionsRepoPublic)
      if (!fiction) return catalogToolResult({ fiction: null, places: [] })
      const places = await getFictionPlacesUseCase(fiction.id, placesRepoPublic)
      const cities = await Promise.all(places.map((place) => cityFields(place.location.cityId)))
      return catalogToolResult({
        fiction: { title: fiction.title, slug: fiction.slug, url: fictionCatalogUrl(fiction.slug) },
        places: places.map((place, index) => placeJson(place, fiction.slug, cities[index] ?? null)),
      })
    },
  )

  server.registerTool(
    GET_PLACE_TOOL,
    {
      title: "Get a visible place",
      description:
        "Get one approved, active place on a published fiction. Identify the place by its slug or id. Returns nothing when the fiction or the place is not publicly visible.",
      inputSchema: {
        fictionSlug: z.string().trim().min(1).describe("Fiction slug"),
        place: z.string().trim().min(1).describe("Place slug or place id"),
      },
    },
    async ({ fictionSlug, place: placeSegment }) => {
      const fiction = await getPublicFictionBySlugUseCase(fictionSlug, fictionsRepoPublic)
      if (!fiction) return catalogToolResult({ place: null })
      const place = await resolvePlaceForFictionPathUseCase(fiction.id, placeSegment, placesRepoPublic, "sm")
      if (!place || place.fictionId !== fiction.id) return catalogToolResult({ place: null })
      const city = await cityFields(place.location.cityId)
      return catalogToolResult({
        place: {
          ...placeJson(place, fiction.slug, city),
          fictionTitle: fiction.title,
          fictionSlug: fiction.slug,
        },
      })
    },
  )
}
