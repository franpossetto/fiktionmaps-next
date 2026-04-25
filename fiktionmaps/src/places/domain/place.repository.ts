import type { Location } from "@/src/locations/domain/location.entity"
import type { MapBbox } from "@/lib/validation/map-query"
import type { CreatePlaceData, UpdatePlaceData } from "./place.schemas"

export interface PlacesRepositoryPort {
  /** List all places as Location[] (place + location + avatar). */
  listAllAsLocations(): Promise<Location[]>
  /** Active place counts per fiction id. */
  getCountsByFictionIds(fictionIds: string[]): Promise<Record<string, number>>
  /** Single place as Location (place + location + avatar). */
  getById(placeId: string): Promise<Location | null>
  /** All places for a specific fiction. */
  getByFictionId(fictionId: string): Promise<Location[]>
  /** All places in a specific city. */
  getByCityId(cityId: string): Promise<Location[]>
  /** Distinct fiction IDs that have at least one place in this city. */
  getFictionIdsByCityId(cityId: string): Promise<string[]>
  /** Map pins within a bbox for the given fictions (not cached — bbox changes with pan/zoom). */
  getByBboxAndFictionIds(fictionIds: string[], bbox: MapBbox): Promise<Location[]>
  /** Create location + place; returns place id or null on failure. */
  create(data: CreatePlaceData): Promise<{ placeId: string } | null>
  /** Update place and its linked location. */
  update(placeId: string, data: UpdatePlaceData): Promise<boolean>
  /** Delete place and related media. */
  delete(placeId: string): Promise<boolean>
}
