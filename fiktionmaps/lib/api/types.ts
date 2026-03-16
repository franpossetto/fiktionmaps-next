import type { createCitiesService } from "@/src/cities/city.services"
import type { createFictionsService } from "@/src/fictions/fiction.services"
import type { createLocationsService } from "@/src/locations/location.services"
import type { createScenesService } from "@/src/scenes/scene.services"
import type { UsersApiService } from "@/src/users/user.mock-api"

export type CitiesService = ReturnType<typeof createCitiesService>
export type FictionsService = ReturnType<typeof createFictionsService>
export type LocationsService = ReturnType<typeof createLocationsService>
export type ScenesService = ReturnType<typeof createScenesService>

export interface ApiServices {
  cities: CitiesService
  fictions: FictionsService
  locations: LocationsService
  scenes: ScenesService
  users: UsersApiService
}
