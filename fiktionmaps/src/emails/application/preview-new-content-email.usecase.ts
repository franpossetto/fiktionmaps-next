import { getSiteUrl } from "@/lib/site"
import type { NewContentEmailProps, NewContentPlaceItem } from "@/lib/email/templates/new-content-email"
import { newContentSubject } from "@/lib/email/templates/new-content-email"
import type { City } from "@/src/cities/domain/city.entity"
import type { FictionWithMedia } from "@/src/fictions/domain/fiction.entity"
import type { Place } from "@/src/places/domain/place.entity"
import type { PlacesRepositoryPort } from "@/src/places/domain/place.repository"

const MAX_VISIBLE_ITEMS = 3

type NewContentRenderer = (
  props: NewContentEmailProps,
) => Promise<{ html: string; text: string }>

type PreviewNewContentDeps = {
  citiesRepo: { getById(id: string): Promise<City | null> }
  placesRepo: Pick<PlacesRepositoryPort, "getByIds">
  fictionsRepo: { getByIds(ids: string[]): Promise<FictionWithMedia[]> }
  renderer: NewContentRenderer
}

function placeImageUrl(place: Place): string | null {
  const url = place.image?.trim()
  if (!url || url.includes("placeholder")) return null
  return url
}

function buildItems(
  places: Place[],
  city: City,
  fictionTitleById: Map<string, string>,
): NewContentPlaceItem[] {
  const site = getSiteUrl()
  const mapBase = `${site}/es/map?city=${encodeURIComponent(city.slug)}`

  return places.map((place) => ({
    name: place.name,
    fictionTitle: fictionTitleById.get(place.fictionId) || "Ficción",
    cityName: city.name,
    href: `${mapBase}&fiction=${encodeURIComponent(place.fictionId)}`,
    imageUrl: placeImageUrl(place),
  }))
}

export async function previewNewContentEmailUseCase(
  input: {
    cityId: string
    placeIds: string[]
    recipientName?: string
    subject?: string
  },
  deps: PreviewNewContentDeps,
): Promise<{ subject: string; html: string; text: string }> {
  const city = await deps.citiesRepo.getById(input.cityId)
  if (!city) throw new Error("City not found")

  const orderedIds = [...new Set(input.placeIds.map((id) => id.trim()).filter(Boolean))]
  if (orderedIds.length === 0) {
    throw new Error("Selecciona al menos un lugar")
  }

  const places = await deps.placesRepo.getByIds(orderedIds, "lg")
  const byId = new Map(places.map((p) => [p.id, p]))
  const orderedPlaces = orderedIds
    .map((id) => byId.get(id))
    .filter((p): p is Place => Boolean(p))
    .filter((p) => p.location.cityId === city.id)

  if (orderedPlaces.length === 0) {
    throw new Error("No se encontraron lugares en esa ciudad")
  }

  const fictionIds = [...new Set(orderedPlaces.map((p) => p.fictionId))]
  const fictions = await deps.fictionsRepo.getByIds(fictionIds)
  const fictionTitleById = new Map(fictions.map((f) => [f.id, f.title]))

  const allItems = buildItems(orderedPlaces, city, fictionTitleById)
  const items = allItems.slice(0, MAX_VISIBLE_ITEMS)
  const moreCount = Math.max(0, allItems.length - items.length)

  const props: NewContentEmailProps = {
    name: input.recipientName?.trim() || "viajero",
    cityName: city.name,
    lead: null,
    items,
    moreCount,
    mapHref: `${getSiteUrl()}/es/map?city=${encodeURIComponent(city.slug)}`,
    unsubscribeUrl: null,
  }

  const { html, text } = await deps.renderer(props)
  const subject =
    input.subject?.trim() || newContentSubject(allItems, moreCount, city.name)

  return { subject, html, text }
}
