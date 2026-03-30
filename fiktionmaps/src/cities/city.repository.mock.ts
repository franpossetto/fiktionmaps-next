import citiesData from "@/data/cities.json"
import type { City } from "./city.domain"
import type { CitiesRepositoryPort } from "./city.repository.port"

/** Minimal city shape from JSON (no created_at/updated_at) */
const rawCities = citiesData as Array<Record<string, unknown>>

function toCity(raw: Record<string, unknown>): City {
  const now = new Date().toISOString()
  return {
    id: String(raw.id),
    name: String(raw.name),
    country: String(raw.country),
    lat: Number(raw.lat),
    lng: Number(raw.lng),
    zoom: Number(raw.zoom),
    created_at: (raw.created_at as string) ?? now,
    updated_at: (raw.updated_at as string) ?? now,
  }
}

export function createMockCitiesRepository(): CitiesRepositoryPort {
  const cities = rawCities.map(toCity)
  return {
    async getAll() {
      return cities
    },
    async getById(id: string) {
      return cities.find((c) => c.id === id) ?? null
    },
    async findByNameAndCountry(name: string, country: string) {
      return cities.find(
        (c) => c.name.toLowerCase() === name.toLowerCase() && c.country.toLowerCase() === country.toLowerCase(),
      ) ?? null
    },
    async create() {
      return null
    },
    async update() {
      return null
    },
    async delete() {
      return false
    },
  }
}
