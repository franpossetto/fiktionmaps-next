import type { FictionExternalIdsRepositoryPort } from "@/src/fiction-external-ids/domain/fiction-external-ids.repository"

export async function upsertFictionExternalIdUseCase(
  fictionId: string,
  provider: string,
  externalId: string,
  repo: FictionExternalIdsRepositoryPort,
): Promise<void> {
  await repo.upsertForFiction(fictionId, provider, externalId)
}
