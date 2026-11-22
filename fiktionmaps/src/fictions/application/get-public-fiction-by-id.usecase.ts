import type { FictionWithMedia } from "@/src/fictions/domain/fiction.entity"
import type { FictionsRepositoryPort } from "@/src/fictions/domain/fiction.repository"

/** Published catalog fiction: `status = approved` and `active = true`. Otherwise null. */
export async function getPublicFictionByIdUseCase(
  fictionId: string,
  repo: Pick<FictionsRepositoryPort, "getById" | "isApprovedActiveFiction">,
): Promise<FictionWithMedia | null> {
  const trimmed = fictionId.trim()
  if (!trimmed) return null
  const visible = await repo.isApprovedActiveFiction(trimmed)
  if (!visible) return null
  return repo.getById(trimmed)
}
