import { getFictionPrimaryCreditRole } from "@/src/fictions/domain/fiction-primary-credit"
import type { Fiction } from "@/src/fictions/domain/fiction.entity"
import type { FictionsRepositoryPort } from "@/src/fictions/domain/fiction.repository"
import type { PersonsRepositoryPort } from "@/src/persons/domain/person.repository"

export type LinkFictionPrimaryCreditInput = {
  fictionId: string
  fictionType: Fiction["type"]
  personId: string
  /** Shown in UI (`fictions.author`). */
  displayName: string
}

/**
 * Links primary credit on `fiction_persons`, then best-effort denormalizes to `fictions.author`.
 * Author UPDATE is staff-only (RLS 057); contributors still succeed via fiction_persons (+ author on create INSERT).
 */
export async function linkFictionPrimaryCreditUseCase(
  input: LinkFictionPrimaryCreditInput,
  personsRepo: PersonsRepositoryPort,
  fictionsRepo: Pick<FictionsRepositoryPort, "update">,
): Promise<void> {
  const role = getFictionPrimaryCreditRole(input.fictionType)
  const displayName = input.displayName.trim()

  await personsRepo.setForFiction(input.fictionId, [
    { person_id: input.personId, role, sort_order: 0 },
  ])

  if (!displayName) return

  const fiction = await fictionsRepo.update(input.fictionId, { author: displayName })
  if (!fiction) {
    console.warn(
      "[linkFictionPrimaryCredit] fiction_persons linked; fictions.author update skipped (likely staff-only RLS)",
      { fictionId: input.fictionId },
    )
  }
}
