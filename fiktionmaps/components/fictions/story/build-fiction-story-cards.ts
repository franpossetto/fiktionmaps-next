import { DEFAULT_FICTION_COVER } from "@/lib/constants/placeholders"
import { haversineDistance } from "@/lib/geo/haversine"
import type { City } from "@/src/cities/domain/city.entity"
import type { FictionWithMedia } from "@/src/fictions/domain/fiction.entity"
import type { Place } from "@/src/places/domain/place.entity"
import type { Scene } from "@/src/scenes/domain/scene.entity"

export const FICTION_STORY_MAX_PLACES = 6
const MAX_PLACES = FICTION_STORY_MAX_PLACES
const SYNOPSIS_MAX_CHARS = 220
const PLACE_MAX_CHARS = 200

export type FictionStoryImageFocus = { x: number; y: number } | null | undefined
export type FictionStoryTone = "wine" | "navy" | "moss" | "sand" | "ink" | "paper"
export type FictionStoryReelFit = "poster" | "landscape"

const TONE_CYCLE: readonly FictionStoryTone[] = ["wine", "navy", "sand", "moss", "ink", "paper"]
const COVER_PIN_MAX = 8
const COVER_RADIUS_M = 16_000
const COVER_MIN_SEPARATION_M = 120
const COVER_ZOOM_MIN = 12
const COVER_ZOOM_MAX = 13

export type FictionStoryMapPin = {
  id: string
  name: string
  image: string
  imageFocus: FictionStoryImageFocus
  lat: number
  lng: number
}

export type FictionStoryCard =
  | {
      kind: "reel"
      id: string
      image: string
      imageFocus: FictionStoryImageFocus
      /** `poster`: vertical, uncropped. `landscape`: image ≤50% + color + text. */
      fit: FictionStoryReelFit
      kicker: string
      title: string
      subtitle?: string
      body?: string
      quote?: boolean
      tone: FictionStoryTone
      href?: string
    }
  | {
      kind: "text"
      id: string
      kicker?: string
      body: string
      quote?: boolean
      tone: FictionStoryTone
    }
  | {
      kind: "close"
      id: string
      title: string
      subtitle: string
      articleHref: string
      mapHref: string
      pins: FictionStoryMapPin[]
      mapCenter: { lat: number; lng: number }
      mapZoom: number
      tone: FictionStoryTone
      nextCityLabel?: string
    }

export type FictionStoryReelCard = Extract<FictionStoryCard, { kind: "reel" }>
export type FictionStoryTextCard = Extract<FictionStoryCard, { kind: "text" }>
export type FictionStoryCloseCard = Extract<FictionStoryCard, { kind: "close" }>

export type FictionStoryCardCopy = {
  typeLabel: string
  coverSubtitle?: string
  hook: string
  quoteKicker: string
  closeTitle: string
  closeTitleCity: (city: string) => string
  closeSubtitle: (count: number) => string
  closeSubtitleMore: (shown: number, total: number) => string
  nextCity: (city: string) => string
  nextCityGeneric: string
}

function toBeats(text: string, maxChars: number, limit = 1): string[] {
  const clean = text.replace(/\s+/g, " ").trim()
  if (!clean) return []
  if (clean.length <= maxChars) return [clean]

  const sentences = clean.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((s) => s.trim()).filter(Boolean) ?? [clean]
  const beats: string[] = []
  let buf = ""
  for (const sentence of sentences) {
    if (!buf) {
      buf = sentence
      continue
    }
    if (`${buf} ${sentence}`.length <= maxChars) {
      buf = `${buf} ${sentence}`
    } else {
      beats.push(clipBeat(buf, maxChars))
      buf = sentence
      if (beats.length >= limit) return beats.slice(0, limit)
    }
  }
  if (buf && beats.length < limit) beats.push(clipBeat(buf, maxChars))
  return beats.slice(0, limit)
}

function clipBeat(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text
  const sliced = text.slice(0, maxChars - 1)
  const lastSpace = sliced.lastIndexOf(" ")
  return `${(lastSpace > 40 ? sliced.slice(0, lastSpace) : sliced).trim()}…`
}

function hasValidCoords(lat: number, lng: number): boolean {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false
  if (lat === 0 && lng === 0) return false
  return Math.abs(lat) <= 90 && Math.abs(lng) <= 180
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

function densestOrigin(places: Place[]): { lat: number; lng: number } {
  let best = places[0]!
  let bestCount = -1
  for (const place of places) {
    const count = places.filter(
      (other) =>
        haversineDistance(place.location.lat, place.location.lng, other.location.lat, other.location.lng) <=
        COVER_RADIUS_M,
    ).length
    if (count > bestCount) {
      best = place
      bestCount = count
    }
  }
  return { lat: best.location.lat, lng: best.location.lng }
}

function groupPlacesByCity(places: Place[], cities: City[]): { city: City | undefined; places: Place[] }[] {
  const knownIds = new Set(cities.map((c) => c.id))
  const groups: { city: City | undefined; places: Place[] }[] = []
  for (const city of cities) {
    const inCity = places.filter((place) => place.location.cityId === city.id)
    if (inCity.length > 0) groups.push({ city, places: inCity })
  }
  const leftover = places.filter((place) => !knownIds.has(place.location.cityId))
  if (leftover.length > 0) groups.push({ city: undefined, places: leftover })
  return groups
}

/** Nearby city pins, spread out, capped — a map cover, not every location on earth. */
function pickCoverMap(
  places: Place[],
  city: City | undefined,
): { pins: FictionStoryMapPin[]; center: { lat: number; lng: number }; zoom: number } {
  const valid = places.filter((p) => hasValidCoords(p.location.lat, p.location.lng))
  const cityOrigin =
    city && hasValidCoords(city.lat, city.lng) ? { lat: city.lat, lng: city.lng } : null
  const origin = cityOrigin ?? (valid.length > 0 ? densestOrigin(valid) : { lat: 48.8566, lng: 2.3522 })
  const zoom = clamp(Math.round(city?.zoom ?? 12), COVER_ZOOM_MIN, COVER_ZOOM_MAX)

  if (valid.length === 0) return { pins: [], center: origin, zoom }

  const inCity = city ? valid.filter((p) => p.location.cityId === city.id) : valid
  const pool = inCity.length > 0 ? inCity : valid
  const ranked = pool
    .map((place) => ({
      place,
      dist: haversineDistance(origin.lat, origin.lng, place.location.lat, place.location.lng),
    }))
    .sort((a, b) => a.dist - b.dist)
  const nearby = ranked.filter((row) => row.dist <= COVER_RADIUS_M)
  const candidates = (nearby.length > 0 ? nearby : ranked.slice(0, COVER_PIN_MAX)).map((row) => row.place)

  const picked: Place[] = []
  for (const place of candidates) {
    if (picked.length >= COVER_PIN_MAX) break
    const farEnough = picked.every(
      (other) =>
        haversineDistance(place.location.lat, place.location.lng, other.location.lat, other.location.lng) >=
        COVER_MIN_SEPARATION_M,
    )
    if (picked.length === 0 || farEnough) picked.push(place)
  }
  for (const place of candidates) {
    if (picked.length >= COVER_PIN_MAX) break
    if (picked.some((other) => other.id === place.id)) continue
    const notStacked = picked.every(
      (other) =>
        haversineDistance(place.location.lat, place.location.lng, other.location.lat, other.location.lng) >= 40,
    )
    if (notStacked) picked.push(place)
  }

  return {
    pins: picked.map((place) => ({
      id: place.id,
      name: place.name,
      image: place.image || DEFAULT_FICTION_COVER,
      imageFocus: place.imageFocus,
      lat: place.location.lat,
      lng: place.location.lng,
    })),
    center: origin,
    zoom,
  }
}

function fictionCoverSrc(fiction: FictionWithMedia): string {
  return (
    fiction.coverImageLarge?.trim() ||
    fiction.coverImage?.trim() ||
    fiction.bannerImage?.trim() ||
    DEFAULT_FICTION_COVER
  )
}

function fictionCoverFocus(fiction: FictionWithMedia): FictionStoryImageFocus {
  if (fiction.coverImageLarge?.trim() || fiction.coverImage?.trim()) return fiction.coverFocus
  if (fiction.bannerImage?.trim()) return fiction.bannerFocus
  return null
}

function fictionCoverFit(fiction: FictionWithMedia): FictionStoryReelFit {
  if (fiction.coverImageLarge?.trim() || fiction.coverImage?.trim()) return "poster"
  if (fiction.bannerImage?.trim()) return "landscape"
  return "poster"
}

export function buildFictionStoryCards({
  fiction,
  places,
  cities,
  scenes,
  copy,
}: {
  fiction: FictionWithMedia
  places: Place[]
  cities: City[]
  scenes: Scene[]
  copy: FictionStoryCardCopy
}): FictionStoryCard[] {
  const pathSlug = fiction.slug.trim()
  const cards: FictionStoryCard[] = []
  let toneIndex = 0
  const nextTone = (): FictionStoryTone => {
    const tone = TONE_CYCLE[toneIndex % TONE_CYCLE.length]
    toneIndex += 1
    return tone
  }

  const yearBit = fiction.year ? String(fiction.year) : ""
  const coverFit = fictionCoverFit(fiction)
  cards.push({
    kind: "reel",
    id: "cover",
    image: fictionCoverSrc(fiction),
    imageFocus: fictionCoverFocus(fiction),
    fit: coverFit,
    kicker: [copy.typeLabel, yearBit].filter(Boolean).join(" · "),
    title: fiction.title,
    subtitle: copy.coverSubtitle,
    tone: coverFit === "landscape" ? nextTone() : "ink",
  })

  const synopsis = toBeats(fiction.description ?? "", SYNOPSIS_MAX_CHARS, 1)[0]
  const introBody = [copy.hook, synopsis].filter(Boolean).join("\n\n")
  if (introBody) {
    cards.push({
      kind: "text",
      id: "intro",
      body: introBody,
      tone: nextTone(),
    })
  }

  const usedSceneIds = new Set<string>()
  const scenesForPlace = (placeId: string): Scene[] =>
    scenes.filter((scene) => scene.places.some((link) => link.placeId === placeId))

  const pushPlaceCards = (city: City | undefined, cityPlaces: Place[]) => {
    const shownPlaces = cityPlaces.slice(0, MAX_PLACES)
    const cityLabel = city ? city.name : ""
    for (const [index, place] of shownPlaces.entries()) {
      const placeBeat = toBeats(place.description ?? "", PLACE_MAX_CHARS, 1)[0]
      let body: string | undefined
      let quote = false

      if (placeBeat) {
        body = placeBeat
      } else {
        const scene = scenesForPlace(place.id).find(
          (s) => !usedSceneIds.has(s.id) && (s.quote?.trim() || s.description?.trim()),
        )
        if (scene) {
          usedSceneIds.add(scene.id)
          const sceneQuote = scene.quote?.trim()
          body = sceneQuote || toBeats(scene.description, PLACE_MAX_CHARS, 1)[0]
          quote = Boolean(sceneQuote)
        }
      }

      cards.push({
        kind: "reel",
        id: `place-${place.id}`,
        image: place.image || DEFAULT_FICTION_COVER,
        imageFocus: place.imageFocus,
        fit: "landscape",
        kicker: quote ? copy.quoteKicker : cityLabel || `${index + 1} / ${shownPlaces.length}`,
        title: place.name,
        subtitle: quote ? undefined : place.location.address || undefined,
        body,
        quote,
        tone: nextTone(),
        href: `/fictions/${pathSlug}/places/${place.slug}`,
      })
    }
  }

  const pushCloseCard = (
    city: City | undefined,
    cityPlaces: Place[],
    nextCity: City | undefined,
    hasNext: boolean,
  ) => {
    const shownCount = Math.min(cityPlaces.length, MAX_PLACES)
    const mapHref = city
      ? `/map?fiction=${encodeURIComponent(fiction.id)}&city=${encodeURIComponent(city.slug)}`
      : `/map?fiction=${encodeURIComponent(fiction.id)}`
    const cover = pickCoverMap(cityPlaces, city)
    cards.push({
      kind: "close",
      id: city ? `close-${city.id}` : "close",
      title: city ? copy.closeTitleCity(city.name) : copy.closeTitle,
      subtitle:
        cityPlaces.length > shownCount
          ? copy.closeSubtitleMore(shownCount, cityPlaces.length)
          : copy.closeSubtitle(cityPlaces.length),
      articleHref: `/fictions/${pathSlug}`,
      mapHref,
      pins: cover.pins,
      mapCenter: cover.center,
      mapZoom: cover.zoom,
      tone: nextTone(),
      nextCityLabel: hasNext
        ? nextCity
          ? copy.nextCity(nextCity.name)
          : copy.nextCityGeneric
        : undefined,
    })
  }

  const groups = groupPlacesByCity(places, cities)
  for (const [index, group] of groups.entries()) {
    const next = groups[index + 1]
    pushPlaceCards(group.city, group.places)
    pushCloseCard(group.city, group.places, next?.city, Boolean(next))
  }

  return cards
}
