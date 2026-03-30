import type { FictionWithMedia } from "@/src/fictions/fiction.domain"
import type { FictionsRepositoryPort } from "@/src/fictions/fiction.repository.port"
import type { PlacesRepositoryPort } from "@/src/places/place.repository.port"
import type { City } from "./city.domain"
import type { CreateCityData, UpdateCityData } from "./city.dtos"
import type { CitiesRepositoryPort } from "./city.repository.port"

interface CitiesServiceDeps {
  citiesRepo: CitiesRepositoryPort
  placesRepo: PlacesRepositoryPort
  fictionsRepo: FictionsRepositoryPort
}

export function createCitiesService(deps: CitiesServiceDeps) {
  async function getAll(): Promise<City[]> {
    return deps.citiesRepo.getAll()
  }

  async function getById(id: string): Promise<City | null> {
    return deps.citiesRepo.getById(id)
  }

  async function create(data: CreateCityData): Promise<City | null> {
    return deps.citiesRepo.create(data)
  }

  async function findOrCreate(data: CreateCityData): Promise<City | null> {
    const existing = await deps.citiesRepo.findByNameAndCountry(data.name, data.country)
    if (existing) return existing
    return deps.citiesRepo.create(data)
  }

  async function update(id: string, data: UpdateCityData): Promise<City | null> {
    return deps.citiesRepo.update(id, data)
  }

  async function deleteCity(id: string): Promise<boolean> {
    return deps.citiesRepo.delete(id)
  }

  async function getCityFictions(cityId: string): Promise<FictionWithMedia[]> {
    const fictionIds = await deps.placesRepo.getFictionIdsByCityId(cityId)
    if (fictionIds.length === 0) return []
    return deps.fictionsRepo.getByIds(fictionIds)
  }

  return {
    getAll,
    getById,
    create,
    findOrCreate,
    update,
    delete: deleteCity,
    getCityFictions,
  }
}
