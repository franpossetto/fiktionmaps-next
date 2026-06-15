"use client"

import { useMemo } from "react"
import Image from "next/image"
import { Clapperboard } from "lucide-react"
import { useRouter } from "@/i18n/navigation"
import { publicFictionScenePath } from "@/lib/fictions/public-fiction-paths"
import type { Place } from "@/src/places/domain/place.entity"
import type { Scene } from "@/src/scenes/domain/scene.entity"

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

type ListItem =
  | { kind: "fiction"; scene: Scene; locationName: string }
  | { kind: "city"; place: Place; fictionSlug: string }

function Thumb({
  src,
  video,
  alt,
  timestamp,
}: {
  src?: string
  video?: string
  alt: string
  timestamp?: string | null
}) {
  return (
    <div className="relative w-28 shrink-0 overflow-hidden rounded-md bg-black" style={{ aspectRatio: "16/9" }}>
      {src ? (
        <Image src={src} alt={alt} fill className="object-cover" sizes="112px" />
      ) : video ? (
        <video
          src={video}
          muted
          playsInline
          preload="metadata"
          className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover"
          aria-hidden
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <Clapperboard className="h-5 w-5 text-white/40" aria-hidden />
        </div>
      )}
      {timestamp && (
        <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1 py-px text-[10px] font-medium text-white">
          {timestamp}
        </span>
      )}
    </div>
  )
}

function Chip({ label }: { label: string }) {
  return (
    <span className="inline-block rounded bg-muted px-1.5 py-px text-[10px] font-medium text-muted-foreground">
      {label}
    </span>
  )
}

export interface SceneUpNextAsideProps {
  fictionPathSlug: string
  currentSceneId: string
  scenes: Scene[]
  relatedPlaces: Place[]
  cityScenes?: Place[]
  cityFictionSlugs?: Record<string, string>
}

export function SceneUpNextAside({
  fictionPathSlug,
  currentSceneId,
  scenes,
  relatedPlaces,
  cityScenes = [],
  cityFictionSlugs = {},
}: SceneUpNextAsideProps) {
  const router = useRouter()

  const sceneLocations = useMemo(
    () => buildSceneLocationsMap(scenes, relatedPlaces),
    [scenes, relatedPlaces],
  )

  const items = useMemo<ListItem[]>(() => {
    const fictionItems: ListItem[] = scenes
      .filter((s) => s.id !== currentSceneId)
      .map((scene) => ({
        kind: "fiction",
        scene,
        locationName:
          sceneLocations.get(scene.locationId)?.name ??
          sceneLocations.get(scene.placeId)?.name ??
          "",
      }))

    const cityItems: ListItem[] = cityScenes.flatMap((place) => {
      const fictionSlug = cityFictionSlugs[place.fictionId]
      if (!fictionSlug) return []
      return [{ kind: "city" as const, place, fictionSlug }]
    })

    return [...fictionItems, ...cityItems]
  }, [scenes, currentSceneId, sceneLocations, cityScenes, cityFictionSlugs])

  if (items.length === 0) {
    return (
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">Up next</h3>
        <p className="text-xs text-muted-foreground">No other scenes available.</p>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <h3 className="mb-2 text-sm font-semibold text-foreground">Up next</h3>
      {items.map((item) => {
        if (item.kind === "fiction") {
          const { scene, locationName } = item
          return (
            <button
              key={scene.id}
              type="button"
              onClick={() => router.push(publicFictionScenePath(fictionPathSlug, scene.id))}
              className="flex w-full gap-2 rounded-lg p-1.5 text-left transition-colors hover:bg-muted/60"
            >
              <Thumb
                src={scene.thumbnail?.trim() || undefined}
                video={scene.videoUrl?.trim() || undefined}
                alt={scene.title}
                timestamp={scene.timestamp}
              />
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="line-clamp-2 text-[13px] font-medium leading-snug text-foreground">
                  {scene.title}
                </p>
                {locationName && (
                  <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{locationName}</p>
                )}
                <div className="mt-1.5">
                  <Chip label="same fiction" />
                </div>
              </div>
            </button>
          )
        }

        const { place, fictionSlug } = item
        return (
          <button
            key={place.id}
            type="button"
            onClick={() => router.push(publicFictionScenePath(fictionSlug, place.id))}
            className="flex w-full gap-2 rounded-lg p-1.5 text-left transition-colors hover:bg-muted/60"
          >
            <Thumb
              src={place.image?.trim() || undefined}
              video={place.videoUrl?.trim() || undefined}
              alt={place.sceneTitle ?? place.name}
            />
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="line-clamp-2 text-[13px] font-medium leading-snug text-foreground">
                {place.sceneTitle ?? place.name}
              </p>
              {place.location.name && (
                <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                  {place.location.name}
                </p>
              )}
              <div className="mt-1.5">
                <Chip label="same city" />
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
