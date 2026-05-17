import type { FictionWithMedia } from "@/src/fictions/domain/fiction.entity"

export interface FictionExternalIdsRepositoryPort {
  findActiveFictionByExternalId(
    provider: string,
    externalId: string,
  ): Promise<FictionWithMedia | null>
  upsertForFiction(fictionId: string, provider: string, externalId: string): Promise<void>
}
