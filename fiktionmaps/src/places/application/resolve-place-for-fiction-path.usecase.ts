import { isUuidString } from "@/lib/validation/primitives"
import type { PlacesRepositoryPort } from "@/src/places/domain/place.repository"
import type { Place } from "@/src/places/domain/place.entity"

/** Public fiction place URL segment: slug or legacy place UUID (no redirect). */
export async function resolvePlaceForFictionPathUseCase(
  fictionId: string,
  segment: string,
  repo: PlacesRepositoryPort,
  avatarVariant: "sm" | "lg" = "lg",
): Promise<Place | null> {
  const raw = segment.trim()
  if (!raw) return null
  const place = isUuidString(raw)
    ? await repo.getById(raw, avatarVariant)
    : await repo.getByFictionIdAndSlug(fictionId, raw, avatarVariant)
  if (!place || place.fictionId !== fictionId) return null
  return place
}
