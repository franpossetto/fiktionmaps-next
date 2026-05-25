import type { z } from "zod"
import { fictionRowStatusSchema } from "@/src/fictions/domain/fiction.schemas"
import type { PlacesRepositoryPort } from "@/src/places/domain/place.repository"
import type { CreatePlaceData } from "@/src/places/domain/place.schemas"
import { resolveUniquePlaceSlug, slugBaseFromPlaceName } from "@/src/places/domain/place-slug"

type CreatePlaceInput = CreatePlaceData & {
  status: z.infer<typeof fictionRowStatusSchema>
  created_by: string
}

export async function createPlaceUseCase(
  data: CreatePlaceInput,
  repo: PlacesRepositoryPort,
): Promise<{ placeId: string; slug: string } | null> {
  const existing = await repo.listSlugsByFictionId(data.fictionId)
  const base = slugBaseFromPlaceName(data.placeName)
  const slug = resolveUniquePlaceSlug(base, existing)
  return repo.create({ ...data, slug })
}
