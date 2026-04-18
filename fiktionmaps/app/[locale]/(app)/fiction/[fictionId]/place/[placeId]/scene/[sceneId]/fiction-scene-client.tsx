"use client"

import { useEffect, useState, useMemo } from "react"
import { useParams } from "next/navigation"
import { useRouter } from "@/i18n/navigation"
import type { Location } from "@/src/locations/domain/location.entity"
import type { Scene } from "@/src/scenes/domain/scene.entity"
import type { Fiction } from "@/src/fictions/domain/fiction.entity"
import { SceneWatchView } from "@/components/scenes/scene-watch-view"
import { getActiveFictionsAction } from "@/src/fictions/infrastructure/next/fiction.actions"
import { getPlaceLocationAction } from "@/src/places/infrastructure/next/place.actions"
import { getSceneByIdAction, listScenesAction } from "@/src/scenes/infrastructure/next/scene.actions"

export function FictionSceneClient() {
  const params = useParams()
  const router = useRouter()
  const fictionId = params.fictionId as string
  const routePlaceId =
    typeof params.placeId === "string" && params.placeId.length > 0
      ? params.placeId
      : null
  const sceneId = params.sceneId as string

  const [loadError, setLoadError] = useState<string | null>(null)
  const [location, setLocation] = useState<Location | null>(null)
  const [fiction, setFiction] = useState<Fiction | undefined>(undefined)
  /** Loaded by id so direct links work even when scene.active is false */
  const [sceneFromUrl, setSceneFromUrl] = useState<Scene | null>(null)
  const [fictionScenes, setFictionScenes] = useState<Scene[]>([])
  const [sceneLocations, setSceneLocations] = useState<Map<string, Location>>(new Map())

  useEffect(() => {
    let cancelled = false
    setLoadError(null)
    setLocation(null)
    setSceneFromUrl(null)

    ;(async () => {
      const scene = await getSceneByIdAction(sceneId)
      if (!scene) {
        if (!cancelled) setLoadError("not_found")
        return
      }
      if (cancelled) return
      if (scene.fictionId !== fictionId) {
        setLoadError("not_found")
        return
      }
      if (routePlaceId && scene.placeId !== routePlaceId) {
        setLoadError("not_found")
        return
      }
      setSceneFromUrl(scene)

      const resolvedPlaceId = routePlaceId ?? scene.placeId
      const loc = await getPlaceLocationAction(resolvedPlaceId)
      if (!loc) {
        if (!cancelled) setLoadError("not_found")
        return
      }
      if (cancelled) return
      if (loc.id !== resolvedPlaceId || loc.fictionId !== fictionId) {
        setLoadError("not_found")
        return
      }

      setLocation(loc)

      const [f, fs] = await Promise.all([
        getActiveFictionsAction().then((rows) => rows.find((item) => item.id === loc.fictionId) ?? null),
        listScenesAction({ fictionId: loc.fictionId, active: "true" }),
      ])
      if (cancelled) return
      setFiction(f ?? undefined)
      setFictionScenes(fs)

      const placeIds = [...new Set([...fs.map((s) => s.placeId), scene.placeId])]
      const placeEntries = await Promise.all(
        placeIds.map(async (id) => {
          const place = await getPlaceLocationAction(id)
          if (!place) return null
          return { placeId: id, place }
        }),
      )
      if (cancelled) return
      const locMap = new Map<string, Location>()
      for (const entry of placeEntries) {
        if (!entry) continue
        const matchingScene = [...fs, scene].find((item) => item.placeId === entry.placeId)
        if (matchingScene) locMap.set(matchingScene.locationId, entry.place)
        locMap.set(entry.placeId, entry.place)
      }
      setSceneLocations(locMap)
    })()

    return () => {
      cancelled = true
    }
  }, [fictionId, routePlaceId, sceneId])

  const currentWatchScene = useMemo(
    () => fictionScenes.find((s) => s.id === sceneId) ?? sceneFromUrl,
    [fictionScenes, sceneId, sceneFromUrl],
  )

  const isTvSeries = fiction?.type === "tv-series"

  const upNextScenes = useMemo(() => {
    if (!currentWatchScene) return []
    return fictionScenes.filter((s) => s.id !== currentWatchScene.id)
  }, [fictionScenes, currentWatchScene])

  const scenePath = (scene: Scene) =>
    `/fiction/${encodeURIComponent(scene.fictionId)}/scene/${encodeURIComponent(scene.id)}`

  if (loadError === "not_found") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
        <p className="text-sm font-medium text-foreground">Scene not found</p>
        <button
          type="button"
          onClick={() => router.push("/map")}
          className="text-sm text-primary underline-offset-4 hover:underline"
        >
          Go to map
        </button>
      </div>
    )
  }

  if (!location || !currentWatchScene) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    )
  }

  return (
    <SceneWatchView
      currentWatchScene={currentWatchScene}
      fiction={fiction}
      isTvSeries={isTvSeries}
      upNextScenes={upNextScenes}
      sceneLocations={sceneLocations}
      onBack={() => router.back()}
      onSelectScene={(scene) => router.push(scenePath(scene))}
    />
  )
}
