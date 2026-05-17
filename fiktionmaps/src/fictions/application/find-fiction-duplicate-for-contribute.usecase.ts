import type { Fiction, FictionWithMedia } from "@/src/fictions/domain/fiction.entity"
import type { FictionsRepositoryPort } from "@/src/fictions/domain/fiction.repository"
import { FICTION_EXTERNAL_ID_PROVIDER } from "@/src/fiction-external-ids/domain/fiction-external-id.entity"
import type { FictionExternalIdsRepositoryPort } from "@/src/fiction-external-ids/domain/fiction-external-ids.repository"
import { normalizeImdbUserInput } from "@/src/fiction-external-ids/domain/fiction-external-id.schemas"

export type FindFictionDuplicateForContributeInput = {
  title: string
  year: number
  type: Fiction["type"]
  imdbId: string
}

export async function findFictionDuplicateForContributeUseCase(
  input: FindFictionDuplicateForContributeInput,
  fictionsRepo: Pick<FictionsRepositoryPort, "findActiveDuplicateForContribute">,
  externalIdsRepo: FictionExternalIdsRepositoryPort,
): Promise<FictionWithMedia | null> {
  const imdbId = normalizeImdbUserInput(input.imdbId)
  if (imdbId) {
    const byImdb = await externalIdsRepo.findActiveFictionByExternalId(
      FICTION_EXTERNAL_ID_PROVIDER.IMDB,
      imdbId,
    )
    if (byImdb) return byImdb
  }

  return fictionsRepo.findActiveDuplicateForContribute({
    title: input.title,
    year: input.year,
    type: input.type,
  })
}
