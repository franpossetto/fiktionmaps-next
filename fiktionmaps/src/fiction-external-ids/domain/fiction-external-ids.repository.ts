import type { FictionWithMedia } from "@/src/fictions/domain/fiction.entity"

export interface FictionExternalIdSummary {
  provider: string
  externalId: string
}

export interface FictionExternalIdsRepositoryPort {
  findActiveFictionByExternalId(
    provider: string,
    externalId: string,
  ): Promise<FictionWithMedia | null>
  upsertForFiction(fictionId: string, provider: string, externalId: string): Promise<void>
  /** All external ids linked to this fiction row (catalog enrichment). */
  listForFiction(fictionId: string): Promise<FictionExternalIdSummary[]>
}
