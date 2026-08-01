"use client"

import { SceneWatchView } from "@/components/scenes/scene-watch-view"
import type { Scene } from "@/src/scenes/domain/scene.entity"
import type { FictionWithMedia } from "@/src/fictions/domain/fiction.entity"
import type { Place } from "@/src/places/domain/place.entity"

export interface FictionSceneWatchClientProps {
  fiction: FictionWithMedia
  fictionPathSlug: string
  currentWatchScene: Scene
  placeName?: string
  placeSlug?: string
  places?: Place[]
}

export function FictionSceneWatchClient({
  fiction,
  fictionPathSlug,
  currentWatchScene,
  placeName,
  placeSlug,
  places = [],
}: FictionSceneWatchClientProps) {
  const isTvSeries = fiction.type === "tv-series"

  return (
    <SceneWatchView
      currentWatchScene={currentWatchScene}
      fiction={fiction}
      fictionPathSlug={fictionPathSlug}
      isTvSeries={isTvSeries}
      placeName={placeName}
      placeSlug={placeSlug}
      places={places}
      useShellMainScroll
    />
  )
}
