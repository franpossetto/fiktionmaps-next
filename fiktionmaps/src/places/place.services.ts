import type { Location } from "@/src/locations"
import type { CreatePlaceData, UpdatePlaceData } from "./place.dtos"
import type { PlacesRepositoryPort } from "./place.repository.port"

interface PlacesServiceDeps {
  placesRepo: PlacesRepositoryPort
}

export function createPlacesService(deps: PlacesServiceDeps) {
  async function listAllAsLocations(): Promise<Location[]> {
    return deps.placesRepo.listAllAsLocations()
  }

  async function create(data: CreatePlaceData): Promise<{ placeId: string } | null> {
    return deps.placesRepo.create(data)
  }

  async function update(placeId: string, data: UpdatePlaceData): Promise<boolean> {
    return deps.placesRepo.update(placeId, data)
  }

  return {
    listAllAsLocations,
    create,
    update,
  }
}
