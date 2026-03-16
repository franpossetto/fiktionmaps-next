import type { Location } from "./location.domain"
import type { LocationsRepositoryPort } from "./location.repository.port"

interface LocationsServiceDeps {
  locationsRepo: LocationsRepositoryPort
}

export function createLocationsService(deps: LocationsServiceDeps) {
  async function getAll(): Promise<Location[]> {
    return deps.locationsRepo.getAll()
  }

  async function getById(id: string): Promise<Location | null> {
    return deps.locationsRepo.getById(id)
  }

  async function getByCityId(cityId: string): Promise<Location[]> {
    return deps.locationsRepo.getByCityId(cityId)
  }

  async function getByFictionId(fictionId: string): Promise<Location[]> {
    return deps.locationsRepo.getByFictionId(fictionId)
  }

  async function getFiltered(
    cityId: string,
    fictionIds: string[],
  ): Promise<Location[]> {
    return deps.locationsRepo.getFiltered(cityId, fictionIds)
  }

  return {
    getAll,
    getById,
    getByCityId,
    getByFictionId,
    getFiltered,
  }
}
