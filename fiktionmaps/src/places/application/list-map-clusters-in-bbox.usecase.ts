import type { MapBbox } from "@/lib/validation/map-query"
import type { MapCluster } from "@/src/places/domain/map-cluster.entity"
import type { PlacesRepositoryPort } from "@/src/places/domain/place.repository"

export type ListMapClustersInBboxInput = {
  bbox: MapBbox
  gridDeg: number
  fictionIds?: string[] | null
  maxClusters?: number
}

export async function listMapClustersInBboxUseCase(
  input: ListMapClustersInBboxInput,
  repo: PlacesRepositoryPort,
): Promise<MapCluster[]> {
  const { bbox, gridDeg, fictionIds, maxClusters } = input
  if (!(gridDeg > 0) || !Number.isFinite(gridDeg)) return []
  const { west, south, east, north } = bbox
  if (![west, south, east, north].every((n) => Number.isFinite(n))) return []
  return repo.getClustersInBbox({
    bbox,
    gridDeg,
    fictionIds: fictionIds?.length ? fictionIds : null,
    maxClusters,
  })
}
