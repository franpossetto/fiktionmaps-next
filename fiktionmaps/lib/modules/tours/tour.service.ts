import type { City } from "@/lib/modules/cities/city.model"
import type { ICityRepository } from "@/lib/modules/cities/city.repository"
import type { Fiction } from "@/lib/modules/fictions/fiction.model"
import type { IFictionRepository } from "@/lib/modules/fictions/fiction.repository"
import type { Location } from "@/lib/modules/locations/location.model"
import type { ILocationRepository } from "@/lib/modules/locations/location.repository"
import type {
  Place,
  PlaceFilters,
  ResolvedTour,
  StoredTourRecord,
  Tour,
  TourDraft,
  TourMetrics,
  TourMode,
  TourStop,
  TourStopWithPlace,
} from "./tour.model"
import type { ITourRepository } from "./tour.repository"

export class TourService {
  constructor(
    private tourRepo: ITourRepository,
    private locationRepo: ILocationRepository,
    private fictionRepo: IFictionRepository,
    private cityRepo: ICityRepository,
  ) {}

  async buildPlaces(): Promise<Place[]> {
    const locations = await this.locationRepo.getAll()
    const fictions = await this.fictionRepo.getAll()
    const cities = await this.cityRepo.getAll()

    const fictionById = new Map<string, Fiction>(fictions.map((f) => [f.id, f]))
    const cityById = new Map<string, City>(cities.map((c) => [c.id, c]))
    const byId = new Map<string, Place>()

    for (const location of locations) {
      const fiction = fictionById.get(location.fictionId)
      const city = cityById.get(location.cityId)
      const tags = new Set<string>()
      if (fiction?.genre) tags.add(slugify(fiction.genre))
      if (fiction?.type) tags.add(slugify(fiction.type))
      if (city?.name) tags.add(slugify(city.name))

      const existing = byId.get(location.id)
      if (existing) {
        if (!existing.fictionIds.includes(location.fictionId)) {
          existing.fictionIds = [...existing.fictionIds, location.fictionId]
        }
        if (!existing.address && location.address) existing.address = location.address
        if (!existing.description && location.description) existing.description = location.description
        if (!existing.visitTip && location.visitTip) existing.visitTip = location.visitTip
        for (const tag of tags) {
          if (!existing.tags.includes(tag)) existing.tags.push(tag)
        }
        continue
      }

      byId.set(location.id, {
        id: location.id,
        name: location.name,
        cityId: location.cityId,
        fictionIds: [location.fictionId],
        lat: location.lat,
        lng: location.lng,
        coverImage: location.image,
        tags: Array.from(tags),
        address: location.address,
        description: location.description,
        visitTip: location.visitTip,
      })
    }

    return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name))
  }

  async getPlace(placeId: string): Promise<Place | undefined> {
    const places = await this.buildPlaces()
    return places.find((p) => p.id === placeId)
  }

  async getAvailableTags(places: Place[]): Promise<string[]> {
    const tagSet = new Set<string>()
    for (const place of places) {
      for (const tag of place.tags) tagSet.add(tag)
    }
    return Array.from(tagSet.values()).sort((a, b) => a.localeCompare(b))
  }

  async filterPlaces(places: Place[], filters: PlaceFilters): Promise<Place[]> {
    const cities = await this.cityRepo.getAll()
    const fictions = await this.fictionRepo.getAll()
    const cityById = new Map<string, City>(cities.map((c) => [c.id, c]))
    const fictionById = new Map<string, Fiction>(fictions.map((f) => [f.id, f]))

    const selectedCityIds = (filters.cityIds ?? []).filter(Boolean)
    const selectedFictions = filters.fictionIds ?? []
    const selectedTags = filters.tags ?? []
    const query = filters.query?.trim().toLowerCase() ?? ""

    return places.filter((place) => {
      if (selectedCityIds.length > 0 && !selectedCityIds.includes(place.cityId)) {
        return false
      }
      if (selectedFictions.length > 0) {
        const fictionMatch = place.fictionIds.some((fictionId) => selectedFictions.includes(fictionId))
        if (!fictionMatch) return false
      }
      if (selectedTags.length > 0) {
        const hasAllTags = selectedTags.every((tag) => place.tags.includes(tag))
        if (!hasAllTags) return false
      }
      if (query.length > 0) {
        const normalizedCity = cityById.get(place.cityId)?.name.toLowerCase() ?? ""
        const normalizedFictions = place.fictionIds
          .map((fictionId) => fictionById.get(fictionId)?.title.toLowerCase() ?? "")
          .join(" ")
        const haystack = `${place.name.toLowerCase()} ${normalizedCity} ${normalizedFictions}`
        if (!haystack.includes(query)) return false
      }
      return true
    })
  }

  createDraft(mode: TourMode, cityId: string | null, createdBy?: string): TourDraft {
    return {
      mode,
      cityId: mode === "singleCity" ? cityId : null,
      title: createdBy ? `${createdBy.split("@")[0]}'s Tour` : "Untitled Tour",
      description: "",
      coverImage: "",
      visibility: "public",
      walkable: true,
      estimatedMinutes: null,
      creatorTips: "",
      stops: [],
    }
  }

  addStopToDraft(draft: TourDraft, place: Place): TourDraft {
    const duplicate = draft.stops.some((stop) => stop.placeId === place.id)
    if (duplicate) return draft

    if (draft.mode === "singleCity" && draft.cityId && draft.cityId !== place.cityId) {
      return draft
    }

    const nextStop: TourStop = {
      id: makeId("stop"),
      tourId: "draft",
      placeId: place.id,
      orderIndex: draft.stops.length,
    }

    return {
      ...draft,
      cityId: draft.mode === "singleCity" ? draft.cityId ?? place.cityId : null,
      stops: [...draft.stops, nextStop],
    }
  }

  removeStopFromDraft(draft: TourDraft, stopId: string): TourDraft {
    const remaining = draft.stops.filter((stop) => stop.id !== stopId)
    return { ...draft, stops: reindexStops(remaining) }
  }

  reorderDraftStops(draft: TourDraft, fromIndex: number, toIndex: number): TourDraft {
    if (fromIndex === toIndex) return draft
    if (fromIndex < 0 || toIndex < 0) return draft
    if (fromIndex >= draft.stops.length || toIndex >= draft.stops.length) return draft

    const reordered = [...draft.stops]
    const [moved] = reordered.splice(fromIndex, 1)
    reordered.splice(toIndex, 0, moved)
    return { ...draft, stops: reindexStops(reordered) }
  }

  async suggestDraftStopsOrder(draft: TourDraft): Promise<TourDraft> {
    if (draft.stops.length < 3) return draft

    const places = await this.buildPlaces()
    const placeById = new Map<string, Place>(places.map((p) => [p.id, p]))

    const stopsWithPlaces = draft.stops
      .map((stop) => {
        const place = placeById.get(stop.placeId)
        if (!place) return null
        return { stop, place }
      })
      .filter((entry): entry is { stop: TourStop; place: Place } => entry !== null)

    if (stopsWithPlaces.length !== draft.stops.length) return draft

    const ordered: TourStop[] = []
    const visitedStopIds = new Set<string>()
    let current: { stop: TourStop; place: Place } | null = stopsWithPlaces[0] ?? null

    while (current) {
      ordered.push(current.stop)
      visitedStopIds.add(current.stop.id)

      let nearest: { stop: TourStop; place: Place } | null = null
      let nearestDistance = Number.POSITIVE_INFINITY

      for (const candidate of stopsWithPlaces) {
        if (visitedStopIds.has(candidate.stop.id)) continue
        const distance = distanceInKm(current.place, candidate.place)
        if (distance < nearestDistance) {
          nearestDistance = distance
          nearest = candidate
        }
      }
      current = nearest
    }

    return { ...draft, stops: reindexStops(ordered) }
  }

  updateDraftMetadata(draft: TourDraft, patch: Partial<Omit<TourDraft, "stops">>): TourDraft {
    return { ...draft, ...patch }
  }

  async resolveDraftStops(stops: TourStop[]): Promise<TourStopWithPlace[]> {
    const places = await this.buildPlaces()
    const placeById = new Map<string, Place>(places.map((p) => [p.id, p]))

    return stops
      .map((stop) => {
        const place = placeById.get(stop.placeId)
        if (!place) return null
        return { ...stop, place }
      })
      .filter((value): value is TourStopWithPlace => value !== null)
      .sort((a, b) => a.orderIndex - b.orderIndex)
  }

  calculateTourMetrics(stops: TourStopWithPlace[]): TourMetrics {
    if (stops.length <= 1) {
      return {
        totalDistanceKm: 0,
        estimatedWalkMinutes: 15,
        estimatedRideMinutes: 10,
        suggestedWalkable: true,
      }
    }

    let totalDistanceKm = 0
    for (let index = 1; index < stops.length; index += 1) {
      totalDistanceKm += distanceInKm(stops[index - 1].place, stops[index].place)
    }

    const stopBufferWalk = stops.length * 10
    const stopBufferRide = stops.length * 6
    const walkingTravelMinutes = (totalDistanceKm / 4.8) * 60
    const rideTravelMinutes = (totalDistanceKm / 14) * 60

    return {
      totalDistanceKm,
      estimatedWalkMinutes: Math.max(15, Math.round(walkingTravelMinutes + stopBufferWalk)),
      estimatedRideMinutes: Math.max(10, Math.round(rideTravelMinutes + stopBufferRide)),
      suggestedWalkable: totalDistanceKm <= 6.5 && stops.length <= 12,
    }
  }

  async saveDraftTour(draft: TourDraft, createdBy?: string): Promise<Tour> {
    const allRecords = await this.tourRepo.listAll()
    const id = makeId("tour")
    const slug = makeUniqueSlug(draft.title || "tour", allRecords)
    const now = new Date().toISOString()

    const places = await this.buildPlaces()
    const placeById = new Map<string, Place>(places.map((p) => [p.id, p]))
    const defaultCover = draft.stops[0] ? placeById.get(draft.stops[0].placeId)?.coverImage ?? "" : ""

    const tour: Tour = {
      id,
      slug,
      title: draft.title.trim() || "Untitled Tour",
      description: draft.description.trim(),
      coverImage: draft.coverImage.trim() || defaultCover,
      mode: draft.mode,
      cityId: draft.mode === "singleCity" ? draft.cityId ?? undefined : undefined,
      visibility: draft.visibility,
      walkable: typeof draft.walkable === "boolean" ? draft.walkable : undefined,
      estimatedMinutes: typeof draft.estimatedMinutes === "number" ? draft.estimatedMinutes : null,
      creatorTips: draft.creatorTips?.trim() || "",
      createdAt: now,
      createdBy,
    }

    const stops = reindexStops(
      draft.stops.map((stop) => ({
        ...stop,
        id: makeId("stop"),
        tourId: id,
      })),
    )

    await this.tourRepo.save({ tour, stops })
    return tour
  }

  async getTourBySlug(slug: string): Promise<ResolvedTour | null> {
    const record = await this.tourRepo.getBySlug(slug)
    if (!record) return null
    const resolvedStops = await this.resolveDraftStops(record.stops)
    return { tour: record.tour, stops: resolvedStops }
  }

  async getPublicTourBySlug(slug: string): Promise<ResolvedTour | null> {
    const resolved = await this.getTourBySlug(slug)
    if (!resolved) return null
    if (resolved.tour.visibility !== "public") return null
    return resolved
  }

  async listUserTours(userId?: string): Promise<Tour[]> {
    if (!userId) return []
    return this.tourRepo.getUserTours(userId)
  }

  async listPublicTours(): Promise<ResolvedTour[]> {
    const allRecords = await this.tourRepo.listAll()
    const bySlug = new Map<string, StoredTourRecord>()

    for (const record of allRecords) {
      if (record.tour.visibility !== "public") continue
      bySlug.set(record.tour.slug, record)
    }

    const results: ResolvedTour[] = []
    for (const record of bySlug.values()) {
      const stops = await this.resolveDraftStops(record.stops)
      if (stops.length > 0) {
        results.push({ tour: record.tour, stops })
      }
    }

    return results.sort((a, b) => b.tour.createdAt.localeCompare(a.tour.createdAt))
  }
}

function reindexStops(stops: TourStop[]): TourStop[] {
  return stops.map((stop, index) => ({ ...stop, orderIndex: index }))
}

function distanceInKm(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
): number {
  const earthRadiusKm = 6371
  const dLat = toRadians(to.lat - from.lat)
  const dLng = toRadians(to.lng - from.lng)
  const lat1 = toRadians(from.lat)
  const lat2 = toRadians(to.lat)

  const sinLat = Math.sin(dLat / 2)
  const sinLng = Math.sin(dLng / 2)
  const a = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return earthRadiusKm * c
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

function makeUniqueSlug(base: string, records: StoredTourRecord[]): string {
  const root = slugify(base) || "tour"
  const existing = new Set(records.map((record) => record.tour.slug))
  if (!existing.has(root)) return root

  let suffix = 2
  let candidate = `${root}-${suffix}`
  while (existing.has(candidate)) {
    suffix += 1
    candidate = `${root}-${suffix}`
  }
  return candidate
}

function makeId(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 9)
  return `${prefix}-${Date.now()}-${random}`
}
