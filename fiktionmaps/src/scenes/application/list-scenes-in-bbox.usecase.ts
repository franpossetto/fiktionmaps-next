import type { MapBbox } from "@/lib/validation/map-query"
import type { ScenesRepositoryPort } from "@/src/scenes/domain/scene.repository"
import type { Location } from "@/src/locations/domain/location.entity"

export async function listScenesInBboxUseCase(
  fictionIds: string[],
  bbox: MapBbox,
  repo: ScenesRepositoryPort,
): Promise<Location[]> {
  return repo.listScenesWithVideoInBbox({ fictionIds, bbox })
}
