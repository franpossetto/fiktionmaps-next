import { createPlacesService, placesSupabaseAdapter } from "@/src/places"

const placesService = createPlacesService({
  placesRepo: placesSupabaseAdapter,
})

export const getAllPlaces = placesService.listAllAsLocations
export const createPlace = placesService.create
export const updatePlace = placesService.update
