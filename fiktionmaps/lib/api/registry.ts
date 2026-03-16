import { createCitiesService } from "@/src/cities/city.services"
import { createMockCitiesRepository } from "@/src/cities/city.repository.mock"
import { createFictionsService } from "@/src/fictions/fiction.services"
import { createMockFictionsRepository } from "@/src/fictions/fiction.repository.mock"
import { createMockLocationsRepository } from "@/src/locations/location.repository.mock"
import { createLocationsService } from "@/src/locations/location.services"
import { createMockScenesRepository } from "@/src/scenes/scene.repository.mock"
import { createScenesService } from "@/src/scenes/scene.services"
import { createMockUsersApiService } from "@/src/users/user.mock-api"
import type { ApiServices } from "./types"

/**
 * Creates API services for client-side use (useApi).
 * Uses mock data only so it can run in the browser without server-only modules.
 * For real data (Supabase), use app-services in server components or server actions.
 */
export function createServices(): ApiServices {
  const mockCitiesRepo = createMockCitiesRepository()
  const mockFictionsRepo = createMockFictionsRepository()
  const mockLocationsRepo = createMockLocationsRepository()
  const mockScenesRepo = createMockScenesRepository()

  const locationsService = createLocationsService({
    locationsRepo: mockLocationsRepo,
  })

  const scenesService = createScenesService({
    scenesRepo: mockScenesRepo,
  })

  const fictionsService = createFictionsService({
    fictionsRepo: mockFictionsRepo,
    locationsRepo: { getByFictionId: (id) => mockLocationsRepo.getByFictionId(id) },
    citiesRepo: { getAll: () => mockCitiesRepo.getAll() },
  })

  const citiesService = createCitiesService({
    citiesRepo: mockCitiesRepo,
    locationsRepo: { getByCityId: (id) => mockLocationsRepo.getByCityId(id) },
    fictionsRepo: { getAll: () => fictionsService.getAll() },
  })

  const usersService = createMockUsersApiService()

  return {
    cities: citiesService,
    fictions: fictionsService,
    locations: locationsService,
    scenes: scenesService,
    users: usersService,
  }
}
