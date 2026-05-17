import type { Place } from "@/src/places/domain/place.entity"
import type { MapBbox } from "@/lib/validation/map-query"
import type { CreatePlaceRepoInput, UpdatePlaceData } from "./place.schemas"

export interface PlacesRepositoryPort {
  listAllPlaces(): Promise<Place[]>
  getCountsByFictionIds(fictionIds: string[]): Promise<Record<string, number>>
  getById(placeId: string, avatarVariant?: "sm" | "lg"): Promise<Place | null>
  getByFictionId(fictionId: string): Promise<Place[]>
  getByCityId(cityId: string): Promise<Place[]>
  getFictionIdsByCityId(cityId: string): Promise<string[]>
  /** Distinct city IDs that have at least one place (via location). */
  listCityIdsWithPlaces(): Promise<string[]>
  getByBboxAndFictionIds(fictionIds: string[], bbox: MapBbox): Promise<Place[]>
  create(data: CreatePlaceRepoInput): Promise<{ placeId: string } | null>
  update(placeId: string, data: UpdatePlaceData): Promise<boolean>
  delete(placeId: string): Promise<boolean>
}
