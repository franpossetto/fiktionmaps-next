import { Suspense } from "react"
import {
  getScenesForCityCached,
  getScenesForFictionCached,
} from "@/src/scenes/infrastructure/next/scene.queries"
import { getPlaceLocationsByIdsCached } from "@/src/places/infrastructure/next/place.queries"
import { scenePlaceIds } from "@/src/scenes/domain/scene.helpers"
import { SceneUpNextAside } from "@/components/scenes/scene-up-next-aside"

function SceneUpNextFallback() {
  return (
    <div className="space-y-3 p-1" aria-hidden>
      <div className="h-4 w-24 animate-pulse rounded bg-muted" />
      <div className="h-16 w-full animate-pulse rounded-lg bg-muted" />
      <div className="h-16 w-full animate-pulse rounded-lg bg-muted" />
      <div className="h-16 w-full animate-pulse rounded-lg bg-muted" />
    </div>
  )
}

async function SceneUpNextLoader({
  fictionId,
  fictionPathSlug,
  currentSceneId,
  primaryPlaceId,
  cityId,
}: {
  fictionId: string
  fictionPathSlug: string
  currentSceneId: string
  primaryPlaceId: string
  cityId: string
}) {
  const [fictionScenes, cityData] = await Promise.all([
    getScenesForFictionCached(fictionId),
    cityId ? getScenesForCityCached(cityId) : Promise.resolve({ scenes: [], fictionSlugById: {} }),
  ])

  const placeIds = [...new Set([...fictionScenes.flatMap(scenePlaceIds), primaryPlaceId])]
  const relatedPlaces = await getPlaceLocationsByIdsCached(placeIds)
  const cityScenes = cityData.scenes.filter((s) => s.fictionId !== fictionId)

  return (
    <SceneUpNextAside
      fictionPathSlug={fictionPathSlug}
      currentSceneId={currentSceneId}
      scenes={fictionScenes}
      relatedPlaces={relatedPlaces}
      cityScenes={cityScenes}
      cityFictionSlugs={cityData.fictionSlugById}
    />
  )
}

/** Streams city/up-next rail off the critical watch path. */
export function SceneUpNextDeferred(props: {
  fictionId: string
  fictionPathSlug: string
  currentSceneId: string
  primaryPlaceId: string
  cityId: string
}) {
  return (
    <Suspense fallback={<SceneUpNextFallback />}>
      <SceneUpNextLoader {...props} />
    </Suspense>
  )
}
