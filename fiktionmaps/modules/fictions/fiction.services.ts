import type { City } from "@/lib/modules/cities/city.model"
import type { Location } from "@/lib/modules/locations/location.model"
import type { Fiction } from "./fiction.domain"
import type { CreateFictionData, UpdateFictionData } from "./fiction.dtos"
import type { FictionsRepositoryPort } from "./fiction.repository.port"

interface FictionsServiceDeps {
  fictionsRepo: FictionsRepositoryPort
  locationsRepo?: {
    getByFictionId(fictionId: string): Promise<Location[]>
  }
  citiesRepo?: {
    getAll(): Promise<City[]>
  }
}

export function createFictionsService(deps: FictionsServiceDeps) {
  async function getAll(): Promise<Fiction[]> {
    return deps.fictionsRepo.getAll()
  }

  async function getById(id: string): Promise<Fiction | null> {
    return deps.fictionsRepo.getById(id)
  }

  async function create(data: CreateFictionData): Promise<Fiction | null> {
    return deps.fictionsRepo.create(data)
  }

  async function update(id: string, data: UpdateFictionData): Promise<Fiction | null> {
    return deps.fictionsRepo.update(id, data)
  }

  async function deleteFiction(id: string): Promise<boolean> {
    return deps.fictionsRepo.delete(id)
  }

  async function getFictionCities(fictionId: string): Promise<City[]> {
    if (!deps.locationsRepo || !deps.citiesRepo) return []
    const locations = await deps.locationsRepo.getByFictionId(fictionId)
    const cityIds = [...new Set(locations.map((l) => l.cityId))]
    const allCities = await deps.citiesRepo.getAll()
    return allCities.filter((c) => cityIds.includes(c.id))
  }

  return {
    getAll,
    getById,
    create,
    update,
    delete: deleteFiction,
    getFictionCities,
  }
}
