import fictionsData from "@/data/fictions.json"
import type { FictionWithMedia } from "./fiction.domain"
import type { FictionsRepositoryPort } from "./fiction.repository.port"

type RawFiction = {
  id: string
  title: string
  type: string
  year: number
  director?: string
  genre: string
  synopsis?: string
  coverImage?: string
  bannerImage?: string
  [key: string]: unknown
}

function toFiction(raw: RawFiction): FictionWithMedia {
  const now = new Date().toISOString()
  return {
    id: raw.id,
    title: raw.title,
    type: raw.type as FictionWithMedia["type"],
    year: raw.year,
    author: raw.director ?? null,
    genre: raw.genre,
    description: raw.synopsis ?? "",
    active: true,
    created_at: now,
    updated_at: now,
    coverImage: raw.coverImage ?? undefined,
    coverImageLarge: raw.coverImage ?? undefined,
    bannerImage: raw.bannerImage ?? undefined,
  }
}

export function createMockFictionsRepository(): FictionsRepositoryPort {
  const fictions = (fictionsData as RawFiction[]).map(toFiction)
  return {
    async getAll() {
      return fictions
    },
    async getById(id: string) {
      return fictions.find((f) => f.id === id) ?? null
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
