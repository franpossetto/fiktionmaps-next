import type { Place } from "@/src/places/domain/place.entity"
import type { Scene } from "@/src/scenes/domain/scene.entity"
import type { ContributorProfileWithDate } from "@/src/contributions/domain/contribution.entity"

export type MapLocationPanel = {
  place: Place | null
  scenes: Scene[]
  contributors: ContributorProfileWithDate[]
}

export type MapLocationPanelDeps = {
  getPlaceDetail: (placeId: string) => Promise<Place | null>
  listActiveScenesForPlace: (placeId: string) => Promise<Scene[]>
  getContributors: (placeId: string) => Promise<ContributorProfileWithDate[]>
}

/** Parallel panel payload for the map sidebar (one composition call). */
export async function getMapLocationPanelUseCase(
  placeId: string,
  deps: MapLocationPanelDeps,
): Promise<MapLocationPanel> {
  const [place, scenes, contributors] = await Promise.all([
    deps.getPlaceDetail(placeId),
    deps.listActiveScenesForPlace(placeId),
    deps.getContributors(placeId),
  ])
  return { place, scenes, contributors }
}
