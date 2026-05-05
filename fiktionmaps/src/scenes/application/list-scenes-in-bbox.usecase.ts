import type { MapBbox } from "@/lib/validation/map-query"
import type { ScenesRepositoryPort } from "@/src/scenes/domain/scene.repository"
import type { Place } from "@/src/places/domain/place.entity"

export async function listScenesInBboxUseCase(
  fictionIds: string[],
  bbox: MapBbox,
  repo: ScenesRepositoryPort,
): Promise<Place[]> {
  return repo.listScenesWithVideoInBbox({ fictionIds, bbox })
}
