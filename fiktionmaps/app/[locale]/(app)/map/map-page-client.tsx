"use client"

import { Suspense, useState, useCallback, useEffect, useMemo, useRef } from "react"
import dynamic from "next/dynamic"
import { useSearchParams } from "next/navigation"
import { useTranslations } from "next-intl"
import { Loader2 } from "lucide-react"
import type { City } from "@/src/cities/domain/city.entity"
import type { FictionWithMedia } from "@/src/fictions/domain/fiction.entity"
import type { Place } from "@/src/places/domain/place.entity"
import type { MapFictionCitySearchEntry } from "@/src/places/domain/map-fiction-city-pair.entity"
import { MapProvider } from "@/lib/map"
import {
  loadCityFictions,
  loadCityPlaces,
  getCachedCityMapData,
  getCachedCityPlaces,
  getCachedCityFictions,
  seedCityMapData,
} from "@/lib/map/city-map-data-cache"
import { prefetchMapLocationPanel } from "@/lib/map/map-location-panel-cache"
import { replaceMapUrlSearch } from "@/lib/map/replace-map-url"
import {
  getPlaceLocationAction,
  getMapClustersInBboxAction,
} from "@/src/places/infrastructure/next/place.actions"
import { isUuidString } from "@/lib/validation/primitives"
import type { MapCluster } from "@/src/places/domain/map-cluster.entity"
import type { MapViewport } from "@/components/map/map-view"
import {
  buildMapQueryString,
  buildWorldMapQueryString,
  isAllFictionsSelected,
  MAP_FICTION_NONE,
  parseFictionIdsFromUrl,
  parseMapBrowseMode,
  parseMapCameraFromUrl,
} from "@/lib/map/map-url"
import {
  approxBboxFromCenter,
  findCachedWorldClusters,
  gridDegForZoom,
  MAP_MODE_CITY,
  MAP_MODE_WORLD,
  normalizeMapClusters,
  pushWorldClustersCache,
  WORLD_OVERVIEW_ZOOM,
  WORLD_Z_EXIT,
  type MapBrowseMode,
  type WorldClustersCacheEntry,
} from "@/lib/map/world-map"
import { CitySelector } from "@/components/map/city-selector"
import { FictionSelector } from "@/components/map/fiction-selector"
import { MapFictionCitySearch } from "@/components/map/map-fiction-city-search"
import { MapMobileSearch } from "@/components/map/map-mobile-search"
import { Map3DToggleSlot, MapMinimapSlot } from "@/components/map/map-slots"
import { MapWorldToggle } from "@/components/map/map-world-toggle"
import { UserMenu } from "@/components/layout/user-menu"

const MapView = dynamic(
  () => import("@/components/map/map-view").then((m) => ({ default: m.MapView })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center bg-background">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden />
      </div>
    ),
  },
)

const LocationDetail = dynamic(
  () =>
    import("@/components/map/location-detail").then((m) => ({
      default: m.LocationDetail,
    })),
  { ssr: false },
)

export type MapPageInitialData = {
  cities: City[]
  cityIdsWithPlaces: string[]
  /** City resolved from ?city= or first city with places (server). */
  initialCity: City | null
  initialPlaces: Place[]
  initialFictions: FictionWithMedia[]
}

type MapBbox = { west: number; south: number; east: number; north: number }

function placeInBbox(place: Place, bbox: MapBbox): boolean {
  const { lat, lng } = place.location
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lng >= bbox.west &&
    lng <= bbox.east &&
    lat >= bbox.south &&
    lat <= bbox.north
  )
}

/** Debounce non-null bounds; null clears immediately so city switches never keep a stale bbox. */
function useDebouncedBounds(
  value: { west: number; south: number; east: number; north: number } | null,
  delayMs: number,
): { west: number; south: number; east: number; north: number } | null {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    if (value === null) {
      setDebounced(null)
      return
    }
    const id = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(id)
  }, [value, delayMs])
  return debounced
}

/** Debounce world viewport for fetch/URL; null clears immediately.
 *  First non-null after null applies immediately (world re-entry / toggle). */
function useDebouncedWorldViewport(
  value: MapViewport | null,
  delayMs: number,
): MapViewport | null {
  const [debounced, setDebounced] = useState(value)
  const hadValueRef = useRef(value != null)
  useEffect(() => {
    if (value === null) {
      hadValueRef.current = false
      setDebounced(null)
      return
    }
    // World re-entry: don't wait — show matching cache / start fetch now.
    if (!hadValueRef.current) {
      hadValueRef.current = true
      setDebounced(value)
      return
    }
    const id = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(id)
  }, [value, delayMs])
  return debounced
}

const BOUNDS_DEBOUNCE_MS = 300
/** Shorter than city bounds — world pans should feel snappy with SWR. */
const WORLD_VIEWPORT_DEBOUNCE_MS = 150

/** Stable empty array reference — avoids new [] identities on every render for consumers that memo on it. */
const EMPTY_PLACES: Place[] = []

function filterPlacesByFictionIds(places: Place[], fictionIds: string[]): Place[] {
  if (fictionIds.length === 0) return []
  const allowed = new Set(fictionIds)
  return places.filter((p) => allowed.has(p.fictionId))
}

function uniqueFictionIdsFromPlaces(places: Place[]): string[] {
  const ids: string[] = []
  const seen = new Set<string>()
  for (const place of places) {
    if (seen.has(place.fictionId)) continue
    seen.add(place.fictionId)
    ids.push(place.fictionId)
  }
  return ids
}

function parseFictionIdsFromParam(param: string | null): string[] | null {
  if (param === MAP_FICTION_NONE) return []
  if (!param?.trim()) return null
  const ids = param
    .split(",")
    .map((s) => s.trim())
    .filter((id) => isUuidString(id))
  return ids.length > 0 ? ids : null
}

function pickRandomCity(cities: City[]): City {
  return cities[Math.floor(Math.random() * cities.length)]
}

function MapLoadingScreen({ message }: { message: string }) {
  return (
    <div className="flex min-h-full items-center justify-center bg-background">
      <div className="flex items-center gap-2">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden />
        <p className="text-muted-foreground">{message}</p>
      </div>
    </div>
  )
}

function readMapUrlPreserve(): { place?: string | null; openSidebar?: string | null } {
  if (typeof window === "undefined") return {}
  const sp = new URLSearchParams(window.location.search)
  return { place: sp.get("place"), openSidebar: sp.get("openSidebar") }
}

function MapPageInner({ initial }: { initial: MapPageInitialData }) {
  const searchParams = useSearchParams()
  const tMap = useTranslations("Map")
  const fictionParam = searchParams.get("fiction")
  const initialCityId = searchParams.get("city")
  const placeParam = searchParams.get("place")
  const deepPlaceFromQuery = placeParam && isUuidString(placeParam) ? placeParam : null
  /** `?place=` focuses pin and opens sidebar; `openSidebar` kept for explicit links. */
  const shouldOpenSidebarFromQuery =
    searchParams.get("openSidebar") === "true" ||
    searchParams.get("openSidebar") === "1" ||
    Boolean(deepPlaceFromQuery)

  const urlBrowseMode = parseMapBrowseMode(searchParams.get("mode"))
  const urlCamera = parseMapCameraFromUrl(searchParams)

  const seededRef = useRef(false)
  if (!seededRef.current && initial.initialCity) {
    seedCityMapData(initial.initialCity.id, {
      places: initial.initialPlaces,
      fictions: initial.initialFictions,
    })
    seededRef.current = true
  }

  const [browseMode, setBrowseMode] = useState<MapBrowseMode>(urlBrowseMode)
  const [worldCamera, setWorldCamera] = useState<{ lat: number; lng: number; zoom: number } | null>(
    () =>
      urlBrowseMode === MAP_MODE_WORLD
        ? urlCamera ??
          (initial.initialCity
            ? { lat: initial.initialCity.lat, lng: initial.initialCity.lng, zoom: 4 }
            : null)
        : null,
  )
  const [worldClusters, setWorldClusters] = useState<MapCluster[]>([])
  const [worldClustersLoading, setWorldClustersLoading] = useState(false)
  /** Only real Mapbox bounds — never approx (avoids wrong first clusters). */
  const [worldViewport, setWorldViewport] = useState<MapViewport | null>(null)
  const worldFetchGenRef = useRef(0)
  const worldClustersCacheRef = useRef<WorldClustersCacheEntry[]>([])
  /** Bumps on every city-sandbox entry so same-city world→city reloads places. */
  const [cityLoadEpoch, setCityLoadEpoch] = useState(0)
  /** After entering city, require zoom above Z_EXIT before zoom-out can exit again. */
  const cityExitArmedRef = useRef(false)
  const [animateCityEntry, setAnimateCityEntry] = useState(false)
  /** Toggle / deep-link world overview fly (not zoom-out exit). */
  const [animateWorldEntry, setAnimateWorldEntry] = useState(false)
  /** Latest Mapbox viewport seen during overview fly (applied when fly ends). */
  const pendingWorldViewportRef = useRef<MapViewport | null>(null)

  const [cities] = useState<City[]>(initial.cities)
  const [selectedCity, setSelectedCity] = useState<City | null>(initial.initialCity)
  const [availableFictions, setAvailableFictions] = useState<FictionWithMedia[]>(
    () => initial.initialFictions,
  )
  const [selectedFictionIds, setSelectedFictionIds] = useState<string[]>(() => {
    if (!initial.initialCity) return []
    const fromUrl = parseFictionIdsFromParam(fictionParam)
    if (fromUrl) return fromUrl
    return uniqueFictionIdsFromPlaces(initial.initialPlaces)
  })
  /** Full city place list — stable source for sidebar “next places”, independent of map bbox.
   *  `viewportPlaces` (the pins actually painted) is derived from this below — never set directly. */
  const [cityPlaces, setCityPlaces] = useState<Place[]>(() => initial.initialPlaces)
  /** A place pinned outside the current fiction/bbox filter (deep link `?place=`). */
  const [deepLinkPlace, setDeepLinkPlace] = useState<Place | null>(null)
  /** Applied on next city data load so URL + fiction filter stay in sync after search. */
  const pendingFictionIdsRef = useRef<string[] | null>(null)
  /** Plain city change (selector / city hit): select all fictions in the new city, ignore stale URL fiction. */
  const selectAllFictionsOnCityLoadRef = useRef(false)
  /** Optimistic chip labels/covers from search until city fictions load. */
  const [fictionChipPreviews, setFictionChipPreviews] = useState<
    { id: string; title: string; coverImage: string | null; coverImageThumb?: string | null }[] | null
  >(null)
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null)
  const [focusedPlaceId, setFocusedPlaceId] = useState<string | null>(null)
  const [detailPanelWidth, setDetailPanelWidth] = useState(0)
  const [is3D, setIs3D] = useState(false)
  const [bounds, setBounds] = useState<{ west: number; south: number; east: number; north: number } | null>(null)
  const [citiesLoading] = useState(false)
  const [cityIdsWithPlaces] = useState<string[]>(initial.cityIdsWithPlaces)
  const [hasAppliedInitialPlaceOpen, setHasAppliedInitialPlaceOpen] = useState(false)
  const [fictionSelectorOpen, setFictionSelectorOpen] = useState(false)
  const [citySelectorOpen, setCitySelectorOpen] = useState(false)
  const debouncedBounds = useDebouncedBounds(bounds, BOUNDS_DEBOUNCE_MS)
  const debouncedWorldViewport = useDebouncedWorldViewport(
    browseMode === MAP_MODE_WORLD ? worldViewport : null,
    WORLD_VIEWPORT_DEBOUNCE_MS,
  )
  const selectedCityId = selectedCity?.id ?? null
  /** True once `cityPlaces` has resolved for the current sandbox (cache hit or network). */
  const [cityDataReady, setCityDataReady] = useState(Boolean(initial.initialCity))
  /** True once availableFictions has resolved for the current city (loaded, possibly empty on error). */
  const [fictionsLoaded, setFictionsLoaded] = useState(Boolean(initial.initialCity))

  const cityNameById = useMemo(() => {
    const map: Record<string, string> = {}
    for (const c of cities) map[c.id] = c.name
    return map
  }, [cities])

  /**
   * Single source of truth for the pins actually painted in city mode. Replaces the four
   * independent `setViewportPlaces(...)` call sites that used to race each other (city load,
   * fiction filter, bbox filter, click-to-pin) — see docs/plans/free-world.md and free-world-perf.md registry.
   * Recomputed from primitives only; no effect ever writes viewportPlaces directly anymore.
   */
  const viewportPlaces = useMemo((): Place[] => {
    if (browseMode === MAP_MODE_WORLD) return EMPTY_PLACES
    if (!selectedCity || !cityDataReady) return EMPTY_PLACES

    // Fiction ids empty while fictions haven't resolved yet = still hydrating (select-all /
    // pending fiction from search), not an explicit "no fiction selected" (MAP_FICTION_NONE).
    const fictionsPending = !fictionsLoaded && selectedFictionIds.length === 0
    const fictionFiltered = fictionsPending
      ? cityPlaces
      : filterPlacesByFictionIds(cityPlaces, selectedFictionIds)

    const bboxFiltered = debouncedBounds
      ? fictionFiltered.filter((p) => placeInBbox(p, debouncedBounds))
      : fictionFiltered

    // Keep the selected/deep-linked place visible even if fiction/bbox filters would hide it
    // (sidebar target, `?place=` focus, or a place clicked outside the current viewport).
    const extras: Place[] = []
    if (
      selectedPlace &&
      selectedPlace.location.cityId === selectedCity.id &&
      !bboxFiltered.some((p) => p.id === selectedPlace.id)
    ) {
      extras.push(selectedPlace)
    }
    if (
      deepLinkPlace &&
      deepLinkPlace.location.cityId === selectedCity.id &&
      !bboxFiltered.some((p) => p.id === deepLinkPlace.id) &&
      !extras.some((p) => p.id === deepLinkPlace.id)
    ) {
      extras.push(deepLinkPlace)
    }

    return extras.length > 0 ? [...bboxFiltered, ...extras] : bboxFiltered
  }, [
    browseMode,
    selectedCity,
    cityDataReady,
    fictionsLoaded,
    cityPlaces,
    selectedFictionIds,
    debouncedBounds,
    selectedPlace,
    deepLinkPlace,
  ])

  const sidebarRelatedPlaces = useMemo(() => {
    if (!selectedPlace) return []
    if (browseMode === MAP_MODE_WORLD) {
      return viewportPlaces.filter((p) => p.id !== selectedPlace.id)
    }
    return filterPlacesByFictionIds(cityPlaces, selectedFictionIds).filter(
      (p) => p.id !== selectedPlace.id,
    )
  }, [browseMode, cityPlaces, selectedFictionIds, selectedPlace?.id, viewportPlaces])

  const isBootstrapping = citiesLoading || !selectedCity

  const loadingMessage = tMap("loadingMap")

  // If the default city has no places, switch once hints arrive (does not block first paint).
  useEffect(() => {
    if (!selectedCity || cityIdsWithPlaces.length === 0 || cities.length === 0) return
    if (cityIdsWithPlaces.includes(selectedCity.id)) return
    const citiesWithPlaces = cities.filter((c) => cityIdsWithPlaces.includes(c.id))
    if (citiesWithPlaces.length > 0) setSelectedCity(pickRandomCity(citiesWithPlaces))
  }, [cityIdsWithPlaces, cities, selectedCity])

  // Sync city FROM the URL only when the URL city changes (back/forward / deep link).
  // Do not depend on selectedCityId — handlers update state before Next propagates searchParams,
  // and depending on both caused B→A→B bounce.
  //
  // Important: replaceMapUrlSearch uses history.replaceState, so useSearchParams can stay
  // stale (e.g. still "chicago" after world→Arezzo). Prefer the live browser query.
  useEffect(() => {
    if (browseMode === MAP_MODE_WORLD) return
    if (cities.length === 0) return
    const liveSlug =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("city")
        : null
    const rawFromUrl = (liveSlug ?? initialCityId)?.trim()
    const slugFromUrl = rawFromUrl?.toLowerCase()
    const fromUrl = rawFromUrl
      ? cities.find((c) => c.slug === slugFromUrl || c.id === rawFromUrl)
      : undefined

    if (fromUrl) {
      setSelectedCity((prev) => {
        if (prev?.id === fromUrl.id) return prev
        // URL-driven navigation (back/forward): honor fiction query, don't force select-all.
        selectAllFictionsOnCityLoadRef.current = false
        return fromUrl
      })
      return
    }

    setSelectedCity((prev) => prev ?? pickRandomCity(cities))
  }, [cities, initialCityId, browseMode])

  useEffect(() => {
    if (browseMode === MAP_MODE_WORLD) return
    if (!selectedCity) {
      setCityDataReady(false)
      setAvailableFictions([])
      setCityPlaces([])
      setFictionsLoaded(false)
      return
    }
    let cancelled = false
    const cityId = selectedCity.id
    const pendingSnapshot = pendingFictionIdsRef.current
    const selectAllOnLoad = selectAllFictionsOnCityLoadRef.current
    setCityDataReady(false)
    setFictionsLoaded(false)
    setBounds(null)

    if (pendingSnapshot?.length) {
      setSelectedFictionIds(pendingSnapshot)
    } else {
      setAvailableFictions([])
      setSelectedFictionIds([])
      setFictionChipPreviews(null)
    }

    // Only sets the primitives (cityPlaces / selectedFictionIds / readiness flags) — the
    // derived `viewportPlaces` memo above recomputes the actual pins from these on its own.
    const applyPlaces = (places: Place[]) => {
      setCityPlaces(places)
      setCityDataReady(true)
    }

    const applyFictions = (fics: FictionWithMedia[]) => {
      if (pendingSnapshot) pendingFictionIdsRef.current = null
      setFictionChipPreviews(null)
      const validPending =
        pendingSnapshot?.filter((id) => fics.some((f) => f.id === id)) ?? []
      if (selectAllOnLoad) selectAllFictionsOnCityLoadRef.current = false
      const fictionIds =
        validPending.length > 0
          ? validPending
          : selectAllOnLoad
            ? fics.map((f) => f.id)
            : parseFictionIdsFromUrl(fictionParam, fics)
      setAvailableFictions(fics)
      setSelectedFictionIds(fictionIds)
      setFictionsLoaded(true)
    }

    // Instant paint when this city was visited or prefetched.
    const cached = getCachedCityMapData(cityId)
    if (cached) {
      applyPlaces(cached.places)
      applyFictions(cached.fictions)
      return
    }

    // Progressive: pins as soon as places resolve (don't wait on fictions).
    const cachedPlaces = getCachedCityPlaces(cityId)
    if (cachedPlaces) applyPlaces(cachedPlaces)
    else setCityPlaces([])

    const cachedFictions = getCachedCityFictions(cityId)
    if (cachedFictions) applyFictions(cachedFictions)

    if (!cachedPlaces) {
      loadCityPlaces(cityId)
        .then((places) => {
          if (!cancelled) applyPlaces(places)
        })
        .catch(() => {
          if (!cancelled) {
            setCityPlaces([])
            setCityDataReady(true)
          }
        })
    }

    if (!cachedFictions) {
      loadCityFictions(cityId)
        .then((fics) => {
          if (!cancelled) applyFictions(fics)
        })
        .catch(() => {
          if (!cancelled) {
            pendingFictionIdsRef.current = null
            setFictionChipPreviews(null)
            setAvailableFictions([])
            setFictionsLoaded(true)
          }
        })
    }

    return () => {
      cancelled = true
    }
    // Fiction filter from URL is applied here on city load; in-session changes use applyFictionSelection.
    // cityLoadEpoch: re-enter same city from world (id unchanged) must still reload sandbox.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCity?.id, cityLoadEpoch, browseMode])

  // Resolve a deep-linked place (`?place=`) so the viewportPlaces memo above can keep it
  // pinned even when the fiction/bbox filters would otherwise hide it.
  useEffect(() => {
    if (browseMode === MAP_MODE_WORLD || !selectedCity) {
      setDeepLinkPlace(null)
      return
    }
    const deepPlaceId = placeParam && isUuidString(placeParam) ? placeParam : null
    if (!deepPlaceId) {
      setDeepLinkPlace(null)
      return
    }
    const fromCity = cityPlaces.find((p) => p.id === deepPlaceId)
    if (fromCity) {
      setDeepLinkPlace(fromCity)
      return
    }
    if (deepLinkPlace?.id === deepPlaceId) return

    let cancelled = false
    getPlaceLocationAction(deepPlaceId)
      .then((loc) => {
        if (!cancelled && loc) setDeepLinkPlace(loc)
      })
      .catch(() => {
        // Deep link couldn't resolve — memo simply won't add an extra pin for it.
      })
    return () => {
      cancelled = true
    }
  }, [browseMode, selectedCity?.id, cityPlaces, placeParam, deepLinkPlace?.id])

  // Free-world LOD: aggregates only (places live in the city sandbox).
  // Stale-while-revalidate: keep previous clusters until the new response lands.
  useEffect(() => {
    if (browseMode !== MAP_MODE_WORLD || !debouncedWorldViewport) return
    // Don't thrash fetches mid–overview fly; seeded approx viewport already loaded.
    if (animateWorldEntry) return

    const { bounds, zoom } = debouncedWorldViewport
    const gridDeg = gridDegForZoom(zoom)
    const cached = findCachedWorldClusters(
      worldClustersCacheRef.current,
      bounds,
      gridDeg,
    )
    if (cached) {
      setWorldClusters(normalizeMapClusters(cached))
      setWorldClustersLoading(false)
      return
    }

    const gen = ++worldFetchGenRef.current
    let cancelled = false
    setWorldClustersLoading(true)

    const run = async () => {
      try {
        const clusters = normalizeMapClusters(
          await getMapClustersInBboxAction(bounds, zoom, null),
        )
        if (cancelled || gen !== worldFetchGenRef.current) return
        worldClustersCacheRef.current = pushWorldClustersCache(
          worldClustersCacheRef.current,
          { bbox: bounds, gridDeg, clusters },
        )
        setWorldClusters(clusters)
      } catch {
        if (cancelled || gen !== worldFetchGenRef.current) return
        // Keep stale clusters on error — empty map is worse than outdated pins.
      } finally {
        if (!cancelled && gen === worldFetchGenRef.current) {
          setWorldClustersLoading(false)
        }
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [browseMode, debouncedWorldViewport, animateWorldEntry])

  /** Apply viewport clusters immediately (cache hit or kick fetch) — used on world re-entry. */
  const syncWorldClustersNow = useCallback((viewport: MapViewport) => {
    const { bounds, zoom } = viewport
    const gridDeg = gridDegForZoom(zoom)
    const cached = findCachedWorldClusters(
      worldClustersCacheRef.current,
      bounds,
      gridDeg,
    )
    if (cached) {
      setWorldClusters(normalizeMapClusters(cached))
      setWorldClustersLoading(false)
      return
    }

    const gen = ++worldFetchGenRef.current
    setWorldClustersLoading(true)
    void getMapClustersInBboxAction(bounds, zoom, null)
      .then((raw) => {
        if (gen !== worldFetchGenRef.current) return
        const clusters = normalizeMapClusters(raw)
        worldClustersCacheRef.current = pushWorldClustersCache(
          worldClustersCacheRef.current,
          { bbox: bounds, gridDeg, clusters },
        )
        setWorldClusters(clusters)
      })
      .catch(() => {
        /* keep stale */
      })
      .finally(() => {
        if (gen === worldFetchGenRef.current) setWorldClustersLoading(false)
      })
  }, [])

  /** Warm cache around a city so zoom-out / back to world feels instant. */
  const prefetchWorldAroundCity = useCallback((city: City) => {
    const zooms = [WORLD_OVERVIEW_ZOOM, WORLD_Z_EXIT]
    for (const zoom of zooms) {
      const bounds = approxBboxFromCenter(city.lat, city.lng, zoom)
      const gridDeg = gridDegForZoom(zoom)
      if (findCachedWorldClusters(worldClustersCacheRef.current, bounds, gridDeg)) {
        continue
      }
      void getMapClustersInBboxAction(bounds, zoom, null)
        .then((raw) => {
          const clusters = normalizeMapClusters(raw)
          if (clusters.length === 0) return
          worldClustersCacheRef.current = pushWorldClustersCache(
            worldClustersCacheRef.current,
            { bbox: bounds, gridDeg, clusters },
          )
        })
        .catch(() => {})
    }
  }, [])

  // Persist world camera in the URL (shareable / refreshable).
  useEffect(() => {
    if (browseMode !== MAP_MODE_WORLD || !debouncedWorldViewport) return
    const { center, zoom } = debouncedWorldViewport
    const qs = buildWorldMapQueryString(
      { lat: center.lat, lng: center.lng, zoom },
      null,
      readMapUrlPreserve(),
    )
    replaceMapUrlSearch(qs)
  }, [browseMode, debouncedWorldViewport])

  useEffect(() => {
    if (placeParam && isUuidString(placeParam)) {
      setFocusedPlaceId(placeParam)
    }
  }, [placeParam])

  useEffect(() => {
    if (!shouldOpenSidebarFromQuery || hasAppliedInitialPlaceOpen) return
    const deepPlaceId = deepPlaceFromQuery
    if (!deepPlaceId) {
      setHasAppliedInitialPlaceOpen(true)
      return
    }
    if (selectedPlace?.id === deepPlaceId) {
      setHasAppliedInitialPlaceOpen(true)
      return
    }
    const targetPlace =
      viewportPlaces.find((p) => p.id === deepPlaceId) ??
      cityPlaces.find((p) => p.id === deepPlaceId)
    if (!targetPlace) return
    setFocusedPlaceId(deepPlaceId)
    setSelectedPlace(targetPlace)
    setHasAppliedInitialPlaceOpen(true)
  }, [
    shouldOpenSidebarFromQuery,
    hasAppliedInitialPlaceOpen,
    deepPlaceFromQuery,
    viewportPlaces,
    cityPlaces,
    selectedPlace?.id,
  ])

  const handleCityChange = useCallback(
    (
      city: City,
      opts?: {
        animate?: boolean
        fictionId?: string
        fictionCoverUrl?: string | null
        fictionTitle?: string | null
      },
    ) => {
      if (
        city.id === selectedCityId &&
        browseMode === MAP_MODE_CITY &&
        !opts?.fictionId
      ) {
        return
      }

      const fictionId = opts?.fictionId?.trim() || null
      if (fictionId) {
        pendingFictionIdsRef.current = [fictionId]
        selectAllFictionsOnCityLoadRef.current = false
        setFictionChipPreviews([
          {
            id: fictionId,
            title: opts?.fictionTitle?.trim() || "",
            coverImage: opts?.fictionCoverUrl ?? null,
          },
        ])
        setSelectedFictionIds([fictionId])
        setAvailableFictions([])
      } else {
        pendingFictionIdsRef.current = null
        selectAllFictionsOnCityLoadRef.current = true
        setFictionChipPreviews(null)
        setAvailableFictions([])
        setSelectedFictionIds([])
      }

      // Drop any in-flight world aggregate response that would wipe pins.
      worldFetchGenRef.current += 1
      setBrowseMode(MAP_MODE_CITY)
      // Keep worldClusters for SWR when zooming back out to world.
      setWorldViewport(null)
      setWorldCamera(null)
      setWorldClustersLoading(false)
      setAnimateWorldEntry(false)
      cityExitArmedRef.current = false
      setAnimateCityEntry(Boolean(opts?.animate))
      // history.replaceState — not router.replace — so in-flight server actions aren't aborted.
      if (fictionId) {
        const params = new URLSearchParams()
        params.set("city", city.slug)
        params.set("fiction", fictionId)
        replaceMapUrlSearch(params.toString())
      } else {
        replaceMapUrlSearch(`city=${encodeURIComponent(city.slug)}`)
      }
      setBounds(null)
      // Synchronous — the city-load effect below also does this, but only on the NEXT render.
      // Without it, the viewportPlaces memo could render one frame mixing the outgoing city's
      // cityPlaces/debouncedBounds with the incoming city's selectedFictionIds.
      setCityDataReady(false)
      setCityPlaces([])
      setDeepLinkPlace(null)
      setSelectedCity(city)
      setSelectedPlace(null)
      setFocusedPlaceId(null)
      // Same city from world: id unchanged — bump so city-load effect rehydrates pins.
      setCityLoadEpoch((n) => n + 1)
      // Warm world clusters around this city so zoom-out / back is instant.
      prefetchWorldAroundCity(city)
    },
    [selectedCityId, browseMode, prefetchWorldAroundCity],
  )

  const handleCityEntryAnimationComplete = useCallback(() => {
    setAnimateCityEntry(false)
  }, [])

  const handleWorldEntryAnimationComplete = useCallback(() => {
    setAnimateWorldEntry(false)
    const pending = pendingWorldViewportRef.current
    pendingWorldViewportRef.current = null
    if (!pending) return
    setWorldViewport(pending)
    setWorldCamera({
      lat: pending.center.lat,
      lng: pending.center.lng,
      zoom: pending.zoom,
    })
    syncWorldClustersNow(pending)
  }, [syncWorldClustersNow])

  const exitCityToWorld = useCallback((viewport: MapViewport) => {
    setIs3D(false)
    setBrowseMode(MAP_MODE_WORLD)
    setAnimateWorldEntry(false)
    pendingWorldViewportRef.current = null
    // Keep stale worldClusters (SWR) — refresh for this viewport immediately.
    // viewportPlaces memo collapses to [] on its own once browseMode is world.
    setSelectedPlace(null)
    setFocusedPlaceId(null)
    setBounds(null)
    cityExitArmedRef.current = false
    const camera = {
      lat: viewport.center.lat,
      lng: viewport.center.lng,
      zoom: viewport.zoom,
    }
    setWorldCamera(camera)
    setWorldViewport(viewport)
    syncWorldClustersNow(viewport)
    replaceMapUrlSearch(buildWorldMapQueryString(camera, null, readMapUrlPreserve()))
  }, [syncWorldClustersNow])

  const handleToggleBrowseMode = useCallback(() => {
    if (browseMode === MAP_MODE_WORLD) {
      setCitySelectorOpen(true)
      return
    }

    if (!selectedCity) return
    setIs3D(false)
    setBrowseMode(MAP_MODE_WORLD)
    setSelectedPlace(null)
    setFocusedPlaceId(null)
    cityExitArmedRef.current = false
    pendingWorldViewportRef.current = null
    const camera = {
      lat: selectedCity.lat,
      lng: selectedCity.lng,
      zoom: WORLD_OVERVIEW_ZOOM,
    }
    const viewport: MapViewport = {
      bounds: approxBboxFromCenter(camera.lat, camera.lng, camera.zoom),
      zoom: camera.zoom,
      center: { lat: camera.lat, lng: camera.lng },
    }
    setAnimateWorldEntry(true)
    setWorldCamera(camera)
    setWorldViewport(viewport)
    syncWorldClustersNow(viewport)
    replaceMapUrlSearch(buildWorldMapQueryString(camera, null, readMapUrlPreserve()))
  }, [browseMode, selectedCity, syncWorldClustersNow])

  const handleViewportChange = useCallback(
    (viewport: MapViewport) => {
      if (browseMode === MAP_MODE_WORLD) {
        // Ignore intermediate cameras during overview fly — seeded viewport already loading.
        if (animateWorldEntry) {
          pendingWorldViewportRef.current = viewport
          return
        }
        setWorldViewport(viewport)
        setWorldCamera({
          lat: viewport.center.lat,
          lng: viewport.center.lng,
          zoom: viewport.zoom,
        })
        return
      }

      // Don't arm/exit while the world→city fly animation is in progress.
      if (animateCityEntry) {
        setBounds(viewport.bounds)
        return
      }

      // City mode: feed bbox filter + hysteresis exit to world.
      setBounds(viewport.bounds)
      if (viewport.zoom > WORLD_Z_EXIT + 0.35) {
        cityExitArmedRef.current = true
        return
      }
      if (cityExitArmedRef.current && viewport.zoom <= WORLD_Z_EXIT) {
        exitCityToWorld(viewport)
      }
    },
    [browseMode, exitCityToWorld, animateCityEntry, animateWorldEntry],
  )

  const handleWorldClusterEnterCity = useCallback(
    (
      cluster: MapCluster,
      opts?: {
        fictionId?: string
        fictionCoverUrl?: string | null
        fictionTitle?: string | null
      },
    ): boolean => {
      if (!cluster.dominantCityId) return false
      const city = cities.find((c) => c.id === cluster.dominantCityId)
      if (!city) return false
      handleCityChange(city, {
        animate: true,
        fictionId: opts?.fictionId,
        fictionCoverUrl: opts?.fictionCoverUrl,
        fictionTitle: opts?.fictionTitle,
      })
      return true
    },
    [cities, handleCityChange],
  )

  const applyFictionSelection = useCallback(
    (next: string[]) => {
      if (!selectedCity || browseMode === MAP_MODE_WORLD) return
      setFictionChipPreviews(null)
      setSelectedFictionIds(next)
      if (availableFictions.length > 0) {
        const qs = buildMapQueryString(
          selectedCity.slug,
          next,
          availableFictions,
          readMapUrlPreserve(),
        )
        replaceMapUrlSearch(qs)
      }
      setSelectedPlace(null)
      setFocusedPlaceId(null)
    },
    [selectedCity, availableFictions, browseMode],
  )

  const handleApplySearchPair = useCallback(
    (entry: MapFictionCitySearchEntry) => {
      const city = cities.find((c) => c.id === entry.cityId)
      if (!city) return

      const sameCity = selectedCity?.id === entry.cityId && browseMode === MAP_MODE_CITY

      // Already in this city sandbox: only adjust fiction filter (no camera jump).
      if (sameCity && availableFictions.length > 0) {
        const prev = selectedFictionIds
        const allSelected = isAllFictionsSelected(prev, availableFictions)
        let next: string[]
        if (allSelected) {
          next = [entry.fictionId]
        } else if (prev.includes(entry.fictionId)) {
          next = prev
        } else {
          next = [...prev, entry.fictionId]
        }
        applyFictionSelection(next)
        return
      }

      handleCityChange(city, {
        animate: true,
        fictionId: entry.fictionId,
        fictionCoverUrl: entry.coverImage,
        fictionTitle: entry.fictionTitle,
      })
    },
    [
      selectedCity?.id,
      selectedFictionIds,
      availableFictions,
      cities,
      applyFictionSelection,
      browseMode,
      handleCityChange,
    ],
  )

  const handleSelectCityFromSearch = useCallback(
    (cityId: string) => {
      if (cityId === selectedCityId && browseMode === MAP_MODE_CITY) return
      const city = cities.find((c) => c.id === cityId)
      if (!city) return
      handleCityChange(city, { animate: true })
    },
    [cities, selectedCityId, browseMode, handleCityChange],
  )

  const handleRemoveFiction = useCallback(
    (fictionId: string) => {
      if (!selectedCity || availableFictions.length === 0) return
      const next = selectedFictionIds.filter((id) => id !== fictionId)
      applyFictionSelection(next)
    },
    [selectedCity, availableFictions, selectedFictionIds, applyFictionSelection],
  )

  const handleToggleFiction = useCallback(
    (fictionId: string) => {
      if (!selectedCity) return
      const next = selectedFictionIds.includes(fictionId)
        ? selectedFictionIds.filter((id) => id !== fictionId)
        : [...selectedFictionIds, fictionId]
      applyFictionSelection(next)
    },
    [selectedCity, selectedFictionIds, applyFictionSelection],
  )

  const handleLocationClick = useCallback((place: Place) => {
    prefetchMapLocationPanel(place.id)
    setSelectedPlace(place)
    setFocusedPlaceId(place.id)
    // viewportPlaces memo keeps `selectedPlace` pinned even if fiction/bbox filters would hide it.
  }, [])

  // const handleNavigateToPlace = useCallback((place: Place) => {
  //   setFocusedPlaceId(place.id)
  // }, [])

  // Modo navegación (carrusel inferior): oculto por ahora — reactivar con ThumbnailCarousel + estado arriba.
  // const isNavigationModeActive = !placeSelectorCollapsed && filteredPlaces.length > 0
  //
  // useEffect(() => {
  //   if (!isNavigationModeActive) return
  //   const handleKeyDown = (e: KeyboardEvent) => {
  //     const target = e.target
  //     const isHTMLElement = target instanceof HTMLElement
  //     const isInputLike =
  //       isHTMLElement &&
  //       (target.tagName === "INPUT" ||
  //         target.tagName === "TEXTAREA" ||
  //         target.getAttribute("contenteditable") === "true")
  //
  //     if (e.key === "Enter" || e.key === " ") {
  //       if (isInputLike) return
  //       if (focusedPlaceId && !selectedPlace) {
  //         const p = filteredPlaces.find((x) => x.id === focusedPlaceId)
  //         if (p) {
  //           e.preventDefault()
  //           setSelectedPlace(p)
  //         }
  //       }
  //     } else if (e.key === "Escape") {
  //       e.preventDefault()
  //       if (selectedPlace) {
  //         setSelectedPlace(null)
  //       } else {
  //         setPlaceSelectorCollapsed(true)
  //       }
  //     }
  //   }
  //   window.addEventListener("keydown", handleKeyDown)
  //   return () => window.removeEventListener("keydown", handleKeyDown)
  // }, [
  //   isNavigationModeActive,
  //   focusedPlaceId,
  //   selectedPlace,
  //   filteredPlaces,
  //   setPlaceSelectorCollapsed,
  // ])

  if (isBootstrapping) {
    return <MapLoadingScreen message={loadingMessage} />
  }

  return (
    <div className="absolute inset-0 min-h-0 flex flex-col">
      <header className="pointer-events-none absolute inset-x-0 top-0 z-[1000]">
        <div className="relative flex w-full items-start justify-between gap-2 px-3 py-3 sm:px-6 sm:py-4 md:grid md:grid-cols-[1fr_minmax(280px,520px)_1fr] md:gap-4 lg:px-8">
          <div className="pointer-events-auto flex min-w-0 items-center gap-2 md:justify-self-start">
            {browseMode === MAP_MODE_CITY && (
              <FictionSelector
                availableFictions={availableFictions}
                selectedFictionIds={selectedFictionIds}
                onToggleFiction={handleToggleFiction}
                open={fictionSelectorOpen}
                onOpenChange={setFictionSelectorOpen}
              />
            )}
          </div>

          <div className="pointer-events-auto relative hidden w-full min-w-0 justify-self-center md:block">
            <MapFictionCitySearch
              selectedCity={selectedCity}
              browseMode={browseMode}
              availableFictions={availableFictions}
              selectedFictionIds={selectedFictionIds}
              fictionChipPreviews={fictionChipPreviews}
              cityPlaces={browseMode === MAP_MODE_CITY ? cityPlaces : []}
              onSelectPair={handleApplySearchPair}
              onSelectCity={handleSelectCityFromSearch}
              onSelectPlace={handleLocationClick}
              onRemoveFiction={handleRemoveFiction}
              onRequestPickFiction={() => setFictionSelectorOpen(true)}
            />
          </div>

          <div className="pointer-events-auto flex items-center gap-2 justify-self-end">
            <MapMobileSearch
              selectedCity={selectedCity}
              browseMode={browseMode}
              availableFictions={availableFictions}
              selectedFictionIds={selectedFictionIds}
              fictionChipPreviews={fictionChipPreviews}
              cityPlaces={browseMode === MAP_MODE_CITY ? cityPlaces : []}
              onSelectPair={handleApplySearchPair}
              onSelectCity={handleSelectCityFromSearch}
              onSelectPlace={handleLocationClick}
              onRemoveFiction={handleRemoveFiction}
              onRequestPickFiction={() => setFictionSelectorOpen(true)}
            />
            {browseMode === MAP_MODE_CITY && <Map3DToggleSlot />}
            {browseMode === MAP_MODE_CITY ? (
              <MapWorldToggle mode={browseMode} onToggle={handleToggleBrowseMode} />
            ) : null}
            <CitySelector
              cities={cities}
              selectedCity={selectedCity}
              buttonLabel={
                browseMode === MAP_MODE_WORLD ? tMap("selectCity") : undefined
              }
              open={citySelectorOpen}
              onOpenChange={setCitySelectorOpen}
              onCityChange={(city) =>
                handleCityChange(city, {
                  animate: browseMode === MAP_MODE_WORLD || city.id !== selectedCityId,
                })
              }
              cityIdsWithPlaces={cityIdsWithPlaces}
              cityWithoutPlacesHint={tMap("cityWithoutPlaces")}
            />
            <div className="rounded-xl border border-border bg-background shadow-sm">
              <UserMenu />
            </div>
          </div>
        </div>
      </header>

      <div className="relative z-0 flex-1 min-h-0 w-full">
        <MapProvider>
          <MapView
            city={selectedCity}
            places={viewportPlaces}
            mode={browseMode}
            worldClusters={worldClusters}
            worldClustersStale={browseMode === MAP_MODE_WORLD && worldClustersLoading}
            cityNameById={cityNameById}
            initialCamera={browseMode === MAP_MODE_WORLD ? worldCamera : null}
            animateCityEntry={animateCityEntry}
            onCityEntryAnimationComplete={handleCityEntryAnimationComplete}
            animateWorldEntry={animateWorldEntry}
            onWorldEntryAnimationComplete={handleWorldEntryAnimationComplete}
            onWorldClusterEnterCity={handleWorldClusterEnterCity}
            onLocationClick={handleLocationClick}
            selectedLocationId={selectedPlace?.id}
            focusLocationId={focusedPlaceId}
            focusPaddingRight={detailPanelWidth}
            is3D={is3D}
            onToggle3D={setIs3D}
            onBoundsChange={browseMode === MAP_MODE_CITY ? setBounds : undefined}
            onViewportChange={handleViewportChange}
          />
        </MapProvider>
        {browseMode === MAP_MODE_WORLD &&
          worldClustersLoading &&
          worldClusters.length === 0 && (
            <div className="pointer-events-none absolute inset-x-0 top-3 z-10 flex justify-center">
              <div className="flex items-center gap-2 rounded-full border border-border bg-background/90 px-3 py-1.5 text-xs text-muted-foreground shadow-sm backdrop-blur-sm">
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                <span>{tMap("loadingClusters")}</span>
              </div>
            </div>
          )}
      </div>

      {browseMode === MAP_MODE_CITY && <MapMinimapSlot />}

      {/*
      <ThumbnailCarousel
        places={filteredPlaces}
        selectedLocationId={focusedPlaceId ?? selectedPlace?.id}
        onLocationClick={handleNavigateToPlace}
        placeSelectorCollapsed={placeSelectorCollapsed}
        setPlaceSelectorCollapsed={setPlaceSelectorCollapsed}
      />
      */}

      {selectedPlace && (
        <LocationDetail
          place={selectedPlace}
          fiction={availableFictions.find((f) => f.id === selectedPlace.fictionId)}
          relatedPlaces={sidebarRelatedPlaces}
          relatedFictions={availableFictions.filter((f) => f.id !== selectedPlace.fictionId)}
          onClose={() => {
            setSelectedPlace(null)
            setDetailPanelWidth(0)
          }}
          onPanelWidthChange={setDetailPanelWidth}
          onSelectRelatedPlace={handleLocationClick}
        />
      )}
    </div>
  )
}

function MapPageFallback() {
  const tMap = useTranslations("Map")
  return <MapLoadingScreen message={tMap("loadingMap")} />
}

export function MapPageClient({ initial }: { initial: MapPageInitialData }) {
  return (
    <Suspense fallback={<MapPageFallback />}>
      <MapPageInner initial={initial} />
    </Suspense>
  )
}
