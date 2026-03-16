import locationsData from "@/data/locations.json"
import type { Location } from "./location.domain"
import type { LocationsRepositoryPort } from "./location.repository.port"

export function createMockLocationsRepository(): LocationsRepositoryPort {
  const locations = locationsData as Location[]
  return {
    async getAll() {
      return locations
    },
    async getById(id: string) {
      return locations.find((l) => l.id === id) ?? null
    },
    async getByCityId(cityId: string) {
      return locations.filter((l) => l.cityId === cityId)
    },
    async getByFictionId(fictionId: string) {
      return locations.filter((l) => l.fictionId === fictionId)
    },
    async getFiltered(cityId: string, fictionIds: string[]) {
      return locations.filter(
        (l) => l.cityId === cityId && fictionIds.includes(l.fictionId),
      )
    },
  }
}
