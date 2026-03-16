import scenesData from "@/data/scenes.json"
import type { Scene } from "./scene.domain"
import type { ScenesRepositoryPort } from "./scene.repository.port"

export function createMockScenesRepository(): ScenesRepositoryPort {
  const scenes = scenesData as Scene[]
  return {
    async getAll() {
      return scenes
    },
    async getByLocationId(locationId: string) {
      return scenes.filter((s) => s.locationId === locationId)
    },
    async getByFictionId(fictionId: string) {
      return scenes.filter((s) => s.fictionId === fictionId)
    },
  }
}
