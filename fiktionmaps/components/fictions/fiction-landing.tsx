"use client"

import { useState, useMemo, useEffect, useRef, useCallback, useTransition, startTransition } from "react"
import { useApi } from "@/lib/api"
import type { FictionWithMedia } from "@/src/fictions/fiction.domain"
import type { Location } from "@/src/locations"
import { FictionCard } from "@/components/fictions/fiction-card"
import { FictionDetail } from "@/components/fictions/fiction-detail"
import { PageHero } from "@/components/layout/page-hero"
import { PageStickyBar } from "@/components/layout/page-sticky-bar"
import { SearchInput } from "@/components/ui/search-input"
import { Film } from "lucide-react"
import { useAuth } from "@/context/auth-context"

type FictionLandingView = "browse" | "detail"

const ITEMS_PER_PAGE = 20

const emptyState = (
  <div className="flex flex-col items-center justify-center py-20 text-center">
    <Film className="mb-3 h-10 w-10 text-muted-foreground/40" />
    <p className="text-sm text-muted-foreground">No fictions found</p>
  </div>
)

interface FictionLandingProps {
  /** Fictions from DB (server). When provided, no client fetch for list. */
  initialFictions?: FictionWithMedia[]
  onViewPlace?: (location: Location) => void
  focusFictionId?: string | null
  onFocusHandled?: () => void
}

export function FictionLanding({
  initialFictions,
  onViewPlace,
  focusFictionId,
  onFocusHandled,
}: FictionLandingProps) {
  const { fictions: fictionService, locations: locationService } = useApi()
  const { user } = useAuth()
  const [allFictions, setAllFictions] = useState<FictionWithMedia[]>(initialFictions ?? [])
  const [locationCountMap, setLocationCountMap] = useState<Map<string, number>>(new Map())
  const [sceneCountMap, setSceneCountMap] = useState<Map<string, number>>(new Map())
  const [likeCountByFictionId, setLikeCountByFictionId] = useState<Record<string, number>>({})
  const [likedFictionIds, setLikedFictionIds] = useState<string[]>([])

  const likedFictionIdSet = useMemo(() => new Set(likedFictionIds), [likedFictionIds])

  useEffect(() => {
    if (initialFictions !== undefined) {
      setAllFictions(initialFictions)
    }
  }, [initialFictions])

  useEffect(() => {
    async function load() {
      let list: FictionWithMedia[]
      if (initialFictions !== undefined) {
        list = initialFictions
      } else {
        const fictions = await fictionService.getAll()
        setAllFictions(fictions)
        list = fictions
      }
      const counts = new Map<string, number>()
      const sceneCounts = new Map<string, number>()
      await Promise.all(
        list.map(async (f) => {
          const locs = await locationService.getByFictionId(f.id)
          counts.set(f.id, locs.length)
          try {
            const res = await fetch(`/api/scenes?fictionId=${encodeURIComponent(f.id)}&active=true`)
            const scenes = res.ok ? await res.json() : []
            sceneCounts.set(f.id, Array.isArray(scenes) ? scenes.length : 0)
          } catch {
            sceneCounts.set(f.id, 0)
          }
        }),
      )
      setLocationCountMap(counts)
      setSceneCountMap(sceneCounts)
    }
    load()
  }, [fictionService, locationService, initialFictions])

  const [view, setView] = useState<FictionLandingView>("browse")
  const [selectedFiction, setSelectedFiction] = useState<FictionWithMedia | null>(null)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(0)
  const [stickyHeader, setStickyHeader] = useState(false)
  const [isPending, startLoadTransition] = useTransition()
  const observerTarget = useRef<HTMLDivElement>(null)
  const heroSectionRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value)
    setPage(0)
  }, [])

  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return
    const handleScroll = () => {
      const hero = heroSectionRef.current
      if (!hero) return
      const heroBottom = hero.getBoundingClientRect().bottom
      startTransition(() => setStickyHeader(heroBottom <= 0))
    }
    container.addEventListener("scroll", handleScroll, { passive: true })
    return () => container.removeEventListener("scroll", handleScroll)
  }, [])

  const filtered = useMemo(() => {
    if (!search.trim()) return allFictions
    const q = search.toLowerCase()
    return allFictions.filter(
      (f) =>
        f.title.toLowerCase().includes(q) ||
        f.genre.toLowerCase().includes(q) ||
        (f.author?.toLowerCase().includes(q) ?? false),
    )
  }, [search, allFictions])

  const displayedItems = filtered.slice(0, (page + 1) * ITEMS_PER_PAGE)
  const hasMore = displayedItems.length < filtered.length

  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isPending) {
          startLoadTransition(() => {
            setPage((p) => p + 1)
          })
        }
      },
      { threshold: 0.1, root: container },
    )
    if (observerTarget.current) {
      observer.observe(observerTarget.current)
    }
    return () => observer.disconnect()
  }, [hasMore, isPending])

  useEffect(() => {
    if (!focusFictionId) return
    const target = allFictions.find((f) => f.id === focusFictionId) || null
    if (target) {
      setSelectedFiction(target)
      setView("detail")
    }
    onFocusHandled?.()
  }, [focusFictionId, onFocusHandled, allFictions])

  // User-specific likes: which fictions are liked by the logged-in user.
  useEffect(() => {
    if (!user) {
      setLikedFictionIds([])
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch("/api/user-fiction-likes")
        const data = (await res.json()) as string[]
        if (!cancelled) setLikedFictionIds(data)
      } catch {
        if (!cancelled) setLikedFictionIds([])
      }
    })()

    return () => {
      cancelled = true
    }
  }, [user?.id])

  // Public like counts for currently displayed items.
  const displayedFictionIdsKey = useMemo(
    () => displayedItems.map((f) => f.id).join(","),
    [displayedItems],
  )

  useEffect(() => {
    const ids = displayedFictionIdsKey ? displayedFictionIdsKey.split(",").filter(Boolean) : []
    if (ids.length === 0) {
      setLikeCountByFictionId({})
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/fictions/likes?fictionIds=${encodeURIComponent(ids.join(","))}`)
        const data = (await res.json()) as { likeCountByFictionId: Record<string, number> }
        if (!cancelled) setLikeCountByFictionId(data.likeCountByFictionId ?? {})
      } catch {
        if (!cancelled) setLikeCountByFictionId({})
      }
    })()

    return () => {
      cancelled = true
    }
  }, [displayedFictionIdsKey])

  const toggleLike = useCallback(
    async (fictionId: string) => {
      if (!user) return

      const res = await fetch("/api/user-fiction-likes/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fictionId }),
      })

      if (!res.ok) return

      const data = (await res.json()) as { liked: boolean; likeCount: number }

      setLikeCountByFictionId((prev) => ({ ...prev, [fictionId]: data.likeCount }))
      setLikedFictionIds((prev) => {
        const set = new Set(prev)
        if (data.liked) set.add(fictionId)
        else set.delete(fictionId)
        return Array.from(set)
      })
    },
    [user?.id],
  )

  if (view === "detail" && selectedFiction) {
    return (
      <FictionDetail
        fiction={selectedFiction}
        onBack={() => {
          setView("browse")
          setSelectedFiction(null)
        }}
        onViewPlace={onViewPlace}
      />
    )
  }

  return (
    <div
      ref={scrollContainerRef}
      className="relative h-full overflow-y-auto bg-background"
    >
      <div ref={heroSectionRef}>
        <PageHero
          title="Fictions"
          subtitle="Explore filming locations from your favorite movies and series"
        >
          <SearchInput
            value={search}
            onChange={handleSearchChange}
            placeholder="Search by title, genre, or director…"
            size="default"
          />
        </PageHero>
      </div>

      {stickyHeader && (
        <PageStickyBar title={<h2 className="text-base font-bold text-foreground">Fictions</h2>}>
          <SearchInput
            value={search}
            onChange={handleSearchChange}
            placeholder="Search…"
            size="compact"
          />
        </PageStickyBar>
      )}

      <div className="px-8 pb-16 pt-2">
        {displayedItems.length === 0 ? (
          emptyState
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2.5 pb-8 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-8">
              {displayedItems.map((fiction) => (
                <FictionCard
                  key={fiction.id}
                  fiction={fiction}
                  locationCount={locationCountMap.get(fiction.id) ?? 0}
                  sceneCount={sceneCountMap.get(fiction.id) ?? 0}
                  href={`/fictions/${fiction.id}`}
                  likeCount={likeCountByFictionId[fiction.id] ?? 0}
                  liked={likedFictionIdSet.has(fiction.id)}
                  onToggleLike={user ? toggleLike : undefined}
                />
              ))}
            </div>

            {hasMore && (
              <div ref={observerTarget} className="flex items-center justify-center py-8">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="h-2 w-2 animate-pulse rounded-full bg-muted-foreground/40" />
                  <span>Loading more…</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

