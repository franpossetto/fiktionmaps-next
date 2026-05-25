import type { FictionAppRoute } from "@/lib/navigation/parse-fiction-app-route"
import { DEFAULT_FICTION_COVER } from "@/lib/constants/placeholders"
import type { FictionWithMedia } from "@/src/fictions/domain/fiction.entity"
import type { NavSearchScope } from "@/src/fictions/domain/nav-search-scope"
import type { Place } from "@/src/places/domain/place.entity"
export type ResolveNavSearchScopeDeps = {
  getFictionBySlug: (slug: string) => Promise<FictionWithMedia | null>
  resolvePlaceForFictionPath: (fictionId: string, segment: string) => Promise<Place | null>
}

function fictionCoverUrl(fiction: FictionWithMedia): string {
  return (
    fiction.coverImage?.trim() ||
    fiction.coverImageLarge?.trim() ||
    fiction.coverImage?.trim() ||
    DEFAULT_FICTION_COVER
  )
}

function placeImageUrl(place: Place, fiction: FictionWithMedia): string {
  return place.image?.trim() || fictionCoverUrl(fiction)
}

export async function resolveNavSearchScopeUseCase(
  route: FictionAppRoute,
  deps: ResolveNavSearchScopeDeps,
): Promise<NavSearchScope> {
  if (route.kind === "catalog") return { kind: "global" }

  const fiction = await deps.getFictionBySlug(route.fictionSlug)
  if (!fiction?.active) return { kind: "global" }

  const fictionSlug = fiction.slug.trim()
  const fictionScope: NavSearchScope = {
    kind: "fiction",
    label: fiction.title,
    imageUrl: fictionCoverUrl(fiction),
    fictionId: fiction.id,
    fictionSlug,
    clearHref: "/fictions",
  }

  if (route.kind === "fiction" || route.kind === "scene") {
    return fictionScope
  }

  const place = await deps.resolvePlaceForFictionPath(fiction.id, route.placeSegment)
  if (!place || place.fictionId !== fiction.id) {
    return fictionScope
  }

  const placeSlug = place.slug.trim()
  const displayName = place.name.trim() || fiction.title
  return {
    kind: "place",
    label: displayName,
    imageUrl: placeImageUrl(place, fiction),
    fictionId: fiction.id,
    fictionSlug,
    placeId: place.id,
    placeSlug,
    clearHref: `/fictions/${fictionSlug}`,
  }
}
