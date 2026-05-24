"use client"

import { useMemo } from "react"
import { useRouter } from "@/i18n/navigation"
import { SceneWatchView } from "@/components/scenes/scene-watch-view"
import { publicFictionScenePath } from "@/lib/fictions/public-fiction-paths"
import type { Place } from "@/src/places/domain/place.entity"
import type { Scene } from "@/src/scenes/domain/scene.entity"
import type { FictionWithMedia } from "@/src/fictions/domain/fiction.entity"

function buildSceneLocationsMap(scenes: Scene[], places: Place[]): Map<string, Place> {
  const placeById = new Map(places.map((p) => [p.id, p]))
  const locMap = new Map<string, Place>()
  for (const scene of scenes) {
    const place = placeById.get(scene.placeId)
    if (!place) continue
    locMap.set(scene.locationId, place)
    locMap.set(scene.placeId, place)
  }
  return locMap
}

export interface FictionSceneWatchClientProps {
  fiction: FictionWithMedia
  fictionPathSlug: string
  currentWatchScene: Scene
  fictionScenes: Scene[]
  relatedPlaces: Place[]
}

export function FictionSceneWatchClient({
  fiction,
  fictionPathSlug,
  currentWatchScene,
  fictionScenes,
  relatedPlaces,
}: FictionSceneWatchClientProps) {
  const router = useRouter()
  const isTvSeries = fiction.type === "tv-series"

  const sceneLocations = useMemo(
    () => buildSceneLocationsMap([...fictionScenes, currentWatchScene], relatedPlaces),
    [fictionScenes, currentWatchScene, relatedPlaces],
  )

  const upNextScenes = useMemo(
    () => fictionScenes.filter((s) => s.id !== currentWatchScene.id),
    [fictionScenes, currentWatchScene.id],
  )

  const scenePath = (scene: Scene) => publicFictionScenePath(fictionPathSlug, scene.id)

  return (
    <SceneWatchView
      currentWatchScene={currentWatchScene}
      fiction={fiction}
      isTvSeries={isTvSeries}
      upNextScenes={upNextScenes}
      sceneLocations={sceneLocations}
      onBack={() => router.back()}
      onSelectScene={(scene) => router.push(scenePath(scene))}
      useShellMainScroll
    />
  )
}
