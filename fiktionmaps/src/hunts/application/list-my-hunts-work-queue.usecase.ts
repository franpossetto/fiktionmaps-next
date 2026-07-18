import type { HuntsRepositoryPort } from "@/src/hunts/domain/hunt.repository"
import type { HuntSourcesRepositoryPort } from "@/src/hunts/domain/hunt-source.repository"
import type { FictionsRepositoryPort } from "@/src/fictions/domain/fiction.repository"
import type { HuntWorkQueueItem } from "@/src/hunts/domain/hunt-work-queue.types"
import { countHuntCandidateStats } from "@/src/hunts/domain/hunt-candidate.helpers"

export async function listMyHuntsWorkQueueUseCase(
  userId: string,
  huntsRepo: HuntsRepositoryPort,
  huntSourcesRepo: HuntSourcesRepositoryPort,
  fictionsRepo: Pick<FictionsRepositoryPort, "getById">,
): Promise<HuntWorkQueueItem[]> {
  const [hunts, sources] = await Promise.all([
    huntsRepo.listByCreatedBy(userId),
    huntSourcesRepo.listByCreatedBy(userId),
  ])

  const sourceById = new Map(sources.map((s) => [s.id, s]))
  const fictionTitleById = new Map<string, string>()

  for (const source of sources) {
    if (!source.fictionId || fictionTitleById.has(source.fictionId)) continue
    const fiction = await fictionsRepo.getById(source.fictionId)
    if (fiction) fictionTitleById.set(source.fictionId, fiction.title)
  }

  const items: HuntWorkQueueItem[] = []

  for (const hunt of hunts) {
    const source = sourceById.get(hunt.huntSourceId)
    if (!source) continue

    const fictionTitle = source.fictionId ? fictionTitleById.get(source.fictionId) ?? null : null

    const counts = countHuntCandidateStats(hunt.payload.places)

    items.push({
      huntId: hunt.id,
      huntSourceId: source.id,
      huntStatus: hunt.status,
      huntCreatedAt: hunt.createdAt,
      huntUpdatedAt: hunt.updatedAt,
      extracted: hunt.stats.extracted ?? counts.extracted,
      shortlisted: hunt.stats.approved ?? counts.shortlisted,
      posted: hunt.stats.posted ?? counts.posted,
      skipped: hunt.stats.skipped ?? counts.skipped,
      sourceUrl: source.sourceUrl,
      scrapeStatus: source.scrapeStatus,
      contextLabel: source.contextLabel,
      fictionId: source.fictionId,
      fictionTitle,
    })
  }

  items.sort(
    (a, b) => new Date(b.huntUpdatedAt).getTime() - new Date(a.huntUpdatedAt).getTime(),
  )

  return items
}
