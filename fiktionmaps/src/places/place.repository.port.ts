import type { Location } from "@/src/locations"
import type { CreatePlaceData, UpdatePlaceData } from "./place.dtos"

export interface PlacesRepositoryPort {
  /** List all places as Location[] (place + location + avatar). */
  listAllAsLocations(): Promise<Location[]>
  /** Distinct fiction IDs that have at least one place in this city (locations → places). */
  getFictionIdsByCityId(cityId: string): Promise<string[]>
  /** Create location + place; returns place id or null on failure. */
  create(data: CreatePlaceData): Promise<{ placeId: string } | null>
  /** Update place and its linked location. */
  update(placeId: string, data: UpdatePlaceData): Promise<boolean>
}
