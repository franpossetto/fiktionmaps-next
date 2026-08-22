import { isUuidString } from "@/lib/validation/primitives"
import type {
  PlaceAvatarVariant,
  PlacesRepositoryPort,
} from "@/src/places/domain/place.repository"
import type { Place } from "@/src/places/domain/place.entity"

/** Public fiction place URL segment: slug or legacy place UUID (no redirect). Active + approved only. */
export async function resolvePlaceForFictionPathUseCase(
  fictionId: string,
  segment: string,
  repo: PlacesRepositoryPort,
  avatarVariant: PlaceAvatarVariant = "xl",
): Promise<Place | null> {
  const raw = segment.trim()
  if (!raw) return null

  if (isUuidString(raw)) {
    const ok = await repo.isApprovedActivePlace(raw)
    if (!ok) return null
    const place = await repo.getById(raw, avatarVariant)
    if (!place || place.fictionId !== fictionId) return null
    return place
  }

  const place = await repo.getByFictionIdAndSlug(fictionId, raw, avatarVariant)
  if (!place || place.fictionId !== fictionId) return null
  return place
}
