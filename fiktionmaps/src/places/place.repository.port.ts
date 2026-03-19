import type { Location } from "@/src/locations"
import type { CreatePlaceData, UpdatePlaceData } from "./place.dtos"

export interface PlacesRepositoryPort {
  /** List all places as Location[] (place + location + avatar). */
  listAllAsLocations(): Promise<Location[]>
  /** Create location + place; returns place id or null on failure. */
  create(data: CreatePlaceData): Promise<{ placeId: string } | null>
  /** Update place and its linked location. */
  update(placeId: string, data: UpdatePlaceData): Promise<boolean>
}
