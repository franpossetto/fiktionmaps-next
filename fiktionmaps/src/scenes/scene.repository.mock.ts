import scenesData from "@/data/scenes.json"
import type { Scene } from "./scene.domain"
import type { CreateSceneData, UpdateSceneData } from "./scene.dtos"
import type { SceneListFilters, ScenesRepositoryPort } from "./scene.repository.port"

function fromJson(raw: Record<string, unknown>): Scene {
  return {
    id: String(raw.id),
    placeId: String(raw.placeId ?? raw.locationId),
    fictionId: String(raw.fictionId),
    locationId: String(raw.locationId),
    title: String(raw.title),
    description: String(raw.description),
    quote: raw.quote != null ? String(raw.quote) : null,
    timestamp: raw.timestamp != null ? String(raw.timestamp) : null,
    season: raw.season != null ? Number(raw.season) : null,
    episode: raw.episode != null ? Number(raw.episode) : null,
    episodeTitle: raw.episodeTitle != null ? String(raw.episodeTitle) : null,
    videoUrl: raw.videoUrl != null ? String(raw.videoUrl) : null,
    sortOrder: typeof raw.sortOrder === "number" ? raw.sortOrder : 0,
    active: raw.active !== false,
    thumbnail: raw.thumbnail != null ? String(raw.thumbnail) : null,
  }
}

export function createMockScenesRepository(): ScenesRepositoryPort {
  const scenes: Scene[] = (scenesData as Record<string, unknown>[]).map(fromJson)

  return {
    async getAll() {
      return [...scenes]
    },
    async getByLocationId(locationId: string) {
      return scenes.filter((s) => s.locationId === locationId)
    },
    async getByFictionId(fictionId: string) {
      return scenes.filter((s) => s.fictionId === fictionId)
    },
    async getByPlaceId(placeId: string) {
      return scenes.filter((s) => s.placeId === placeId)
    },
    async getById(id: string) {
      return scenes.find((s) => s.id === id) ?? null
    },
    async list(filters: SceneListFilters) {
      return scenes.filter((s) => {
        if (filters.fictionId && s.fictionId !== filters.fictionId) return false
        if (filters.placeId && s.placeId !== filters.placeId) return false
        if (filters.locationId && s.locationId !== filters.locationId) return false
        if (filters.active !== undefined && s.active !== filters.active) return false
        return true
      })
    },
    async create(data: CreateSceneData) {
      const scene: Scene = {
        id: `mock-${Date.now()}`,
        placeId: data.placeId,
        fictionId: data.fictionId,
        locationId: "",
        title: data.title,
        description: data.description,
        quote: data.quote ?? null,
        timestamp: data.timestampLabel ?? null,
        season: data.season ?? null,
        episode: data.episode ?? null,
        episodeTitle: data.episodeTitle ?? null,
        videoUrl: data.videoUrl ?? null,
        sortOrder: data.sortOrder ?? 0,
        active: data.active ?? true,
        thumbnail: null,
      }
      scenes.push(scene)
      return scene
    },
    async update(id: string, data: UpdateSceneData) {
      const i = scenes.findIndex((s) => s.id === id)
      if (i === -1) return null
      const prev = scenes[i]!
      const next: Scene = {
        ...prev,
        ...(data.fictionId !== undefined && { fictionId: data.fictionId }),
        ...(data.placeId !== undefined && { placeId: data.placeId }),
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.quote !== undefined && { quote: data.quote }),
        ...(data.timestampLabel !== undefined && { timestamp: data.timestampLabel }),
        ...(data.season !== undefined && { season: data.season }),
        ...(data.episode !== undefined && { episode: data.episode }),
        ...(data.episodeTitle !== undefined && { episodeTitle: data.episodeTitle }),
        ...(data.videoUrl !== undefined && { videoUrl: data.videoUrl }),
        ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
        ...(data.active !== undefined && { active: data.active }),
      }
      scenes[i] = next
      return next
    },
    async delete(id: string) {
      const i = scenes.findIndex((s) => s.id === id)
      if (i === -1) return false
      scenes.splice(i, 1)
      return true
    },
  }
}
