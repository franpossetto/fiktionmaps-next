import type { Fiction } from "@/modules/fictions/fiction.domain"
import type { City } from "./city.domain"
import type { UpdateCityData } from "./city.dtos"
import type { CitiesRepositoryPort } from "./city.repository.port"

interface CitiesServiceDeps {
  citiesRepo: CitiesRepositoryPort
  locationsRepo?: {
    getByCityId(cityId: string): Promise<{ fictionId: string }[]>
  }
  fictionsRepo?: {
    getAll(): Promise<Fiction[]>
  }
}

export function createCitiesService(deps: CitiesServiceDeps) {
  async function getAll(): Promise<City[]> {
    return deps.citiesRepo.getAll()
  }

  async function getById(id: string): Promise<City | null> {
    return deps.citiesRepo.getById(id)
  }

  async function update(id: string, data: UpdateCityData): Promise<City | null> {
    return deps.citiesRepo.update(id, data)
  }

  async function getCityFictions(cityId: string): Promise<Fiction[]> {
    if (!deps.locationsRepo || !deps.fictionsRepo) return []
    const locations = await deps.locationsRepo.getByCityId(cityId)
    const fictionIds = [...new Set(locations.map((l) => l.fictionId))]
    const allFictions = await deps.fictionsRepo.getAll()
    return allFictions.filter((f) => fictionIds.includes(f.id))
  }

  return {
    getAll,
    getById,
    update,
    getCityFictions,
  }
}
