"use client"

import Image from "next/image"
import { Map } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import { Link, usePathname, useRouter } from "@/i18n/navigation"
import { UserMenu } from "@/components/layout/user-menu"
import { ScopedSearchInput } from "@/components/ui/scoped-search-input"
import {
  getActiveFictionsAction,
  getNavSearchScopeAction,
} from "@/src/fictions/infrastructure/next/fiction.actions"
import { getFictionPlacesAction } from "@/src/places/infrastructure/next/place.actions"
import { listScenesAction } from "@/src/scenes/infrastructure/next/scene.actions"
import type { FictionWithMedia } from "@/src/fictions/domain/fiction.entity"
import type { NavSearchScope } from "@/src/fictions/domain/nav-search-scope"
import type { Place } from "@/src/places/domain/place.entity"
import type { Scene } from "@/src/scenes/domain/scene.entity"
import { publicFictionPlacePath, publicFictionScenePath } from "@/lib/fictions/public-fiction-paths"

const TOP_NAV_HEADER_CLASS =
  "sticky top-0 z-40 h-[60px] border-b border-border/80 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90"

const TOP_NAV_INNER_PAD =
  "mx-auto h-full w-full max-w-[1900px] px-3 sm:px-6 lg:px-10"

/** Ancho fijo de acciones laterales en móvil (mapa + perfil) para que el buscador no se solape. */
const TOP_NAV_MOBILE_SIDE_SLOT = "flex h-10 w-10 shrink-0 items-center justify-center"

const GLOBAL_SCOPE: NavSearchScope = { kind: "global" }

type ScopedHit =
  | { kind: "place"; place: Place }
  | { kind: "scene"; scene: Scene }

/**
 * Misma barra que `AppTopNavbar` pero sin buscador (flujos de contribución y otras pantallas donde no aplica).
 */
export function AppTopNavbarNoSearch() {
  const tNav = useTranslations("Nav")

  return (
    <header className={TOP_NAV_HEADER_CLASS}>
      <div className={`${TOP_NAV_INNER_PAD} flex items-center justify-between gap-4`}>
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/map" className="inline-flex shrink-0 items-center rounded-md">
            <Image
              src="/fiktionmaps-logo.svg"
              alt={tNav("logoAlt")}
              width={119}
              height={25}
              priority
              className="h-[22px] w-auto shrink-0 object-contain"
            />
          </Link>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <UserMenu />
        </div>
      </div>
    </header>
  )
}

export function AppTopNavbar() {
  const router = useRouter()
  const pathname = usePathname()
  const tNav = useTranslations("Nav")
  const tFictions = useTranslations("Fictions")
  const tCommon = useTranslations("Common")
  const [search, setSearch] = useState("")
  const [isFocused, setIsFocused] = useState(false)
  const [scope, setScope] = useState<NavSearchScope>(GLOBAL_SCOPE)
  const [fictions, setFictions] = useState<FictionWithMedia[]>([])
  const [places, setPlaces] = useState<Place[]>([])
  const [scenes, setScenes] = useState<Scene[]>([])
  const [loaded, setLoaded] = useState(false)
  const [loadFailed, setLoadFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    void getNavSearchScopeAction(pathname ?? "").then((next) => {
      if (!cancelled) setScope(next)
    })
    return () => {
      cancelled = true
    }
  }, [pathname])

  useEffect(() => {
    setSearch("")
    setLoaded(false)
    setLoadFailed(false)
    setPlaces([])
    setScenes([])
    setFictions([])
  }, [pathname])

  const query = search.trim()
  const filteredFictions = useMemo(() => {
    const q = query.toLowerCase()
    if (!q) return []
    return fictions
      .filter((f) => {
        const title = f.title.toLowerCase()
        const author = f.author?.toLowerCase() ?? ""
        const genre = f.genre?.toLowerCase() ?? ""
        return title.includes(q) || author.includes(q) || genre.includes(q)
      })
      .slice(0, 7)
  }, [fictions, query])

  const filteredScoped = useMemo((): ScopedHit[] => {
    const q = query.toLowerCase()
    if (!q) return []
    const hits: ScopedHit[] = []
    if (scope.kind === "fiction" || scope.kind === "place") {
      const placePool = scope.kind === "place" ? [] : places
      for (const place of placePool) {
        const name = place.name.toLowerCase()
        const desc = place.description?.toLowerCase() ?? ""
        if (name.includes(q) || desc.includes(q)) hits.push({ kind: "place", place })
      }
      const scenePool =
        scope.kind === "place"
          ? scenes.filter((s) => s.placeId === scope.placeId)
          : scenes
      for (const scene of scenePool) {
        const title = scene.title.toLowerCase()
        const desc = scene.description?.toLowerCase() ?? ""
        if (title.includes(q) || desc.includes(q)) hits.push({ kind: "scene", scene })
      }
      return hits.slice(0, 8)
    }
    return []
  }, [places, scenes, query, scope])

  const placeholder =
    scope.kind === "fiction"
      ? tNav("searchInFiction", { name: scope.label })
      : scope.kind === "place"
        ? tNav("searchInPlace", { name: scope.label })
        : tNav("searchFictions")

  async function ensureSearchCorpusLoaded() {
    if (loaded) return
    setLoadFailed(false)
    try {
      if (scope.kind === "global") {
        const data = await getActiveFictionsAction()
        setFictions(data)
      } else if (scope.kind === "fiction") {
        const [placeRows, sceneRows] = await Promise.all([
          getFictionPlacesAction(scope.fictionId),
          listScenesAction({ fictionId: scope.fictionId, active: "true" }),
        ])
        setPlaces(placeRows)
        setScenes(sceneRows)
      } else if (scope.kind === "place") {
        const sceneRows = await listScenesAction({ placeId: scope.placeId, active: "true" })
        setScenes(sceneRows)
      }
      setLoaded(true)
    } catch (err) {
      console.error("nav search corpus load failed", err)
      setLoadFailed(true)
    }
  }

  function goToFiction(fiction: FictionWithMedia) {
    router.push(`/fictions/${fiction.slug ?? fiction.id}`)
    setIsFocused(false)
    setSearch("")
  }

  function goToScopedHit(hit: ScopedHit) {
    const fictionSlug =
      scope.kind === "fiction"
        ? scope.fictionSlug
        : scope.kind === "place"
          ? scope.fictionSlug
          : ""
    if (!fictionSlug) return
    if (hit.kind === "place") {
      router.push(publicFictionPlacePath(fictionSlug, hit.place.slug.trim() || hit.place.id))
    } else {
      router.push(publicFictionScenePath(fictionSlug, hit.scene.id))
    }
    setIsFocused(false)
    setSearch("")
  }

  function clearScopeChip() {
    if (scope.kind === "global") return
    router.push(scope.clearHref)
    setSearch("")
    setIsFocused(false)
  }

  const chip =
    scope.kind === "fiction" || scope.kind === "place"
      ? {
          label: scope.label,
          imageUrl: scope.imageUrl,
          onClear: clearScopeChip,
          clearLabel: tNav("clearSearchScope"),
        }
      : null

  const showDropdown = isFocused && query.length > 0
  const isGlobal = scope.kind === "global"

  return (
    <header className={TOP_NAV_HEADER_CLASS}>
      <div
        className={`${TOP_NAV_INNER_PAD} flex h-full items-center gap-2 md:grid md:grid-cols-[1fr_minmax(280px,520px)_1fr] md:gap-4`}
      >
        <Link
          href="/map"
          aria-label={tNav("openMap")}
          title={tNav("map")}
          className={`${TOP_NAV_MOBILE_SIDE_SLOT} rounded-xl text-foreground transition-colors hover:bg-accent md:hidden`}
        >
          <Map className="h-5 w-5" aria-hidden />
        </Link>
        <div className="hidden min-w-0 items-center gap-3 md:flex md:justify-self-start">
          <Link href="/map" className="inline-flex shrink-0 items-center rounded-md">
            <Image
              src="/fiktionmaps-logo.svg"
              alt={tNav("logoAlt")}
              width={119}
              height={25}
              priority
              className="h-[22px] w-auto shrink-0 object-contain"
            />
          </Link>
        </div>
        <div
          className="relative flex min-w-0 flex-1 items-center gap-1.5 md:w-full md:flex-none md:gap-0"
          onFocus={() => {
            setIsFocused(true)
            void ensureSearchCorpusLoaded()
          }}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
              setIsFocused(false)
            }
          }}
        >
          <ScopedSearchInput
            value={search}
            onChange={setSearch}
            placeholder={placeholder}
            chip={chip}
            className="min-w-0 flex-1"
          />
          {showDropdown ? (
            <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded-xl border border-border bg-background shadow-lg">
              {loadFailed ? (
                <div className="px-3 py-2 text-sm text-muted-foreground">{tCommon("error")}</div>
              ) : !loaded ? (
                <div className="px-3 py-2 text-sm text-muted-foreground">{tCommon("loading")}</div>
              ) : isGlobal ? (
                filteredFictions.length > 0 ? (
                  <ul className="max-h-80 overflow-y-auto p-1">
                    {filteredFictions.map((fiction) => (
                      <li key={fiction.id}>
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => goToFiction(fiction)}
                          className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left hover:bg-accent"
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                              {fiction.type === "tv-series"
                                ? tFictions("typeTvBadge")
                                : fiction.type === "movie"
                                  ? tFictions("typeMovie")
                                  : fiction.type === "book"
                                    ? tFictions("typeBook")
                                    : fiction.type}
                            </span>
                            <span className="truncate text-sm font-medium text-foreground">{fiction.title}</span>
                          </span>
                          <span className="ml-2 shrink-0 text-xs text-muted-foreground">{fiction.year ?? ""}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="px-3 py-2 text-sm text-muted-foreground">{tNav("noMatchingFictions")}</div>
                )
              ) : filteredScoped.length > 0 ? (
                <ul className="max-h-80 overflow-y-auto p-1">
                  {filteredScoped.map((hit) => (
                    <li key={hit.kind === "place" ? hit.place.id : hit.scene.id}>
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => goToScopedHit(hit)}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-accent"
                      >
                        <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          {hit.kind === "place" ? tNav("searchResultPlace") : tNav("searchResultScene")}
                        </span>
                        <span className="truncate text-sm font-medium text-foreground">
                          {hit.kind === "place"
                            ? hit.place.name.trim() || hit.place.slug
                            : hit.scene.title}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="px-3 py-2 text-sm text-muted-foreground">{tNav("noMatchingInScope")}</div>
              )}
            </div>
          ) : null}
        </div>
        <div
          className={`${TOP_NAV_MOBILE_SIDE_SLOT} shrink-0 md:w-auto md:justify-self-end`}
        >
          <UserMenu />
        </div>
      </div>
    </header>
  )
}
