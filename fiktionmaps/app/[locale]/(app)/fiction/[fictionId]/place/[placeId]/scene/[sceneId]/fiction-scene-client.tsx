"use client"

import { useEffect, useState, useMemo } from "react"
import { useParams } from "next/navigation"
import { useRouter } from "@/i18n/navigation"
import type { Location } from "@/src/locations"
import type { Scene } from "@/src/scenes"
import type { Fiction } from "@/src/fictions/fiction.domain"
import { useApi } from "@/lib/api"
import { SceneWatchView } from "@/components/scenes/scene-watch-view"

export function FictionSceneClient() {
  const params = useParams()
  const router = useRouter()
  const fictionId = params.fictionId as string
  const routePlaceId =
    typeof params.placeId === "string" && params.placeId.length > 0
      ? params.placeId
      : null
  const sceneId = params.sceneId as string

  const { fictions: fictionsService, locations: locationsService } = useApi()

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
      const sceneRes = await fetch(`/api/scenes/${encodeURIComponent(sceneId)}`)
      if (!sceneRes.ok) {
        if (!cancelled) setLoadError("not_found")
        return
      }
      const scene = (await sceneRes.json()) as Scene
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
      const placeRes = await fetch(`/api/map/place?placeId=${encodeURIComponent(resolvedPlaceId)}`)
      if (!placeRes.ok) {
        if (!cancelled) setLoadError("not_found")
        return
      }
      const loc = (await placeRes.json()) as Location
      if (cancelled) return
      if (loc.id !== resolvedPlaceId || loc.fictionId !== fictionId) {
        setLoadError("not_found")
        return
      }

      setLocation(loc)

      const [f, fs] = await Promise.all([
        fictionsService.getById(loc.fictionId),
        (async () => {
          const fictionParams = new URLSearchParams({ fictionId: loc.fictionId, active: "true" })
          const fsRes = await fetch(`/api/scenes?${fictionParams}`)
          return (fsRes.ok ? await fsRes.json() : []) as Scene[]
        })(),
      ])
      if (cancelled) return
      setFiction(f ?? undefined)
      setFictionScenes(fs)

      const locationIds = [...new Set([...fs.map((s) => s.locationId), scene.locationId])]
      const locs = await Promise.all(locationIds.map((id) => locationsService.getById(id)))
      if (cancelled) return
      const locMap = new Map<string, Location>()
      for (const l of locs) {
        if (l) locMap.set(l.id, l)
      }
      setSceneLocations(locMap)
    })()

    return () => {
      cancelled = true
    }
  }, [fictionId, routePlaceId, sceneId, fictionsService, locationsService])

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
