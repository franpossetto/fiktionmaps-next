import type { FictionWithMedia } from "@/src/fictions/domain/fiction.entity"
import type { FictionsRepositoryPort } from "@/src/fictions/domain/fiction.repository"

/** Published catalog fiction: `status = approved` and `active = true`. Otherwise null. */
export async function getPublicFictionBySlugUseCase(
  slug: string,
  repo: Pick<FictionsRepositoryPort, "getBySlug" | "isApprovedActiveFiction">,
): Promise<FictionWithMedia | null> {
  const trimmed = slug.trim()
  if (!trimmed) return null
  const fiction = await repo.getBySlug(trimmed)
  if (!fiction) return null
  const visible = await repo.isApprovedActiveFiction(fiction.id)
  return visible ? fiction : null
}
