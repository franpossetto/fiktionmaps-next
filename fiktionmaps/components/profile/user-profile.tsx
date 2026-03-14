"use client"

import { useState, useRef, useEffect, useMemo, useCallback } from "react"
import Image from "next/image"
import Link from "next/link"
import type { UserProfile as UserProfileType, CheckIn } from "@/lib/modules/users"
import type { City } from "@/lib/modules/cities"
import type { Location } from "@/lib/modules/locations"
import type { Fiction } from "@/lib/modules/fictions"
import type { Tour } from "@/lib/modules/tours"
import { useApi } from "@/lib/api"
import { ProfileHeader } from "./profile-header"
import { VisitedPlaces } from "./visited-places"
import { ContributorData } from "./contributor-data"
import { PageStickyBar } from "@/components/layout/page-sticky-bar"
import { ImageIcon, Share2, Upload, Route, ChevronRight, Sparkles } from "lucide-react"
import { useAuth } from "@/context/auth-context"
import { Button } from "@/components/ui/button"
import { getCurrentUserProfileAction, type ProfileWithOnboarding } from "@/lib/auth/profile.actions"

interface UserProfileProps {
  profile?: UserProfileType
}

// Onboarding progress: 4 conceptual steps so the bar feels more meaningful.
// We only infer 2 of them from the profile (username + avatar), each worth 2 steps.
const ONBOARDING_STEPS = 4
const DEFAULT_AVATAR = "/logo-icon.png"

function onboardingProgress(profile: { username?: string; avatar?: string }): { completed: number; percent: number } {
  const hasUsername = (profile.username?.trim().length ?? 0) >= 3
  const hasAvatar = !!(profile.avatar && profile.avatar !== DEFAULT_AVATAR)
  // Username and avatar each count as 2 conceptual steps (out of 4 total).
  const completed = (hasUsername ? 2 : 0) + (hasAvatar ? 2 : 0)
  const percent = (Math.min(completed, ONBOARDING_STEPS) / ONBOARDING_STEPS) * 100
  return { completed, percent }
}

type TabView = "gallery" | "contributor" | "tours"

const tabs: { id: TabView; label: string; icon: React.ElementType }[] = [
  { id: "gallery", label: "Check-Ins", icon: ImageIcon },
  { id: "contributor", label: "My Contributions", icon: Upload },
  { id: "tours", label: "My Tours", icon: Route },
]

export function UserProfileComponent({ profile }: UserProfileProps) {
  const { user } = useAuth()
  const { cities: cityService, locations, tours, users } = useApi()
  const [allCities, setAllCities] = useState<City[]>([])
  const [locationMap, setLocationMap] = useState<Map<string, Location>>(new Map())
  const [loadedProfile, setLoadedProfile] = useState<ProfileWithOnboarding | UserProfileType | undefined>(profile)
  const [contributedLocations, setContributedLocations] = useState<Location[]>([])
  const [contributedFictions, setContributedFictions] = useState<Fiction[]>([])
  const [contributedPhotos, setContributedPhotos] = useState<CheckIn[]>([])
  const [activeTab, setActiveTab] = useState<TabView>("gallery")
  const [stickyHeader, setStickyHeader] = useState(false)
  const [myTours, setMyTours] = useState<Tour[]>([])
  const scrollRef = useRef<HTMLDivElement>(null)
  const heroRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    cityService.getAll().then(setAllCities)
    locations.getAll().then((locs) => setLocationMap(new Map(locs.map((l) => [l.id, l]))))
  }, [cityService, locations])

  const refetchProfile = useCallback(() => {
    if (!user?.id) return
    getCurrentUserProfileAction().then((result) => {
      if (result.data) setLoadedProfile(result.data)
    })
  }, [user?.id])

  // Prefer Supabase profile when using Supabase auth; fallback to API/mock or minimal profile
  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    getCurrentUserProfileAction().then((result) => {
      if (cancelled) return
      if (result.data) {
        setLoadedProfile(result.data)
        return
      }
      // No Supabase profile: try API/mock, or show minimal profile so we don't hang on "Loading profile…"
      if (!profile) {
        const fallbackProfile: ProfileWithOnboarding = {
          id: user.id,
          username: user.name || user.email?.split("@")[0] || "",
          avatar: user.avatar || "/logo-icon.png",
          bio: "",
          interests: [],
          joinedDate: new Date().toISOString(),
          visitedLocations: [],
          checkIns: [],
          favoriteLocations: [],
          stats: {
            totalVisits: 0,
            locationsExplored: 0,
            frictionsConnected: 0,
          },
          onboardingCompleted: false,
        }
        users
          .getProfile(user.id)
          .then((p) => {
            if (!cancelled) setLoadedProfile(p ?? fallbackProfile)
          })
          .catch(() => {
            if (!cancelled) setLoadedProfile(fallbackProfile)
          })
      }
    })
    users.getContributedLocations(user.id).then(setContributedLocations)
    users.getContributedFictions(user.id).then(setContributedFictions)
    users.getContributedPhotos(user.id).then(setContributedPhotos)
    const onFocus = () => refetchProfile()
    window.addEventListener("focus", onFocus)
    return () => {
      cancelled = true
      window.removeEventListener("focus", onFocus)
    }
  }, [user?.id, user?.name, user?.email, user?.avatar, profile, users, refetchProfile])

  const activeProfile = profile ?? loadedProfile
  const cityNameById = useMemo(() => new Map(allCities.map((city) => [city.id, city.name])), [allCities])

  useEffect(() => {
    const container = scrollRef.current
    if (!container) return
    const onScroll = () => {
      const hero = heroRef.current
      if (!hero) return
      setStickyHeader(hero.getBoundingClientRect().bottom <= 0)
    }
    container.addEventListener("scroll", onScroll, { passive: true })
    return () => container.removeEventListener("scroll", onScroll)
  }, [])

  const refreshMyTours = useCallback(() => {
    tours.listUserTours(user?.id).then(setMyTours)
  }, [user?.id, tours])

  useEffect(() => {
    refreshMyTours()
    window.addEventListener("storage", refreshMyTours)
    window.addEventListener("focus", refreshMyTours)
    return () => {
      window.removeEventListener("storage", refreshMyTours)
      window.removeEventListener("focus", refreshMyTours)
    }
  }, [refreshMyTours])

  const [tourStopCounts, setTourStopCounts] = useState<Map<string, number>>(new Map())

  useEffect(() => {
    if (myTours.length === 0) return
    Promise.all(
      myTours.map((tour) =>
        tours.getTourBySlug(tour.slug).then((r) => ({ slug: tour.slug, count: r?.stops.length ?? 0 })),
      ),
    ).then((results) => {
      setTourStopCounts(new Map(results.map((r) => [r.slug, r.count])))
    })
  }, [myTours, tours])

  const myToursWithStops = useMemo(
    () =>
      myTours.map((tour) => ({
        tour,
        stopsCount: tourStopCounts.get(tour.slug) ?? 0,
      })),
    [myTours, tourStopCounts],
  )

  if (!user) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-sm text-muted-foreground">Please log in to view your profile.</p>
        <Button asChild>
          <Link href="/login">Log in</Link>
        </Button>
      </div>
    )
  }

  if (!activeProfile) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Loading profile…
      </div>
    )
  }

  // Prefer profile.username; if empty, fall back to auth user display name (from Supabase auth)
  const displayName =
    activeProfile.username ||
    user?.name ||
    user?.email?.split("@")[0] ||
    ""

  const visitedLocations = activeProfile.visitedLocations
    .map((id) => locationMap.get(id))
    .filter((loc): loc is Location => loc !== undefined)

  const handleShare = (checkIn?: CheckIn) => {
    const text = checkIn
      ? `${displayName} checked in at: ${locationMap.get(checkIn.locationId)?.name}\n"${checkIn.caption}"`
      : `Check out my film location profile: ${displayName}`
    if (navigator.share) {
      navigator.share({ title: "Film Location Explorer", text })
    }
  }

  const TabBar = ({ compact = false }: { compact?: boolean }) => (
    <div className={`flex overflow-x-auto gap-1 ${compact ? "py-3 px-8" : "py-4 px-8"}`}>
      {tabs.map((tab) => {
        const Icon = tab.icon
        const isActive = activeTab === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap flex-shrink-0 text-sm border ${
              isActive
                ? "bg-muted text-foreground border-border"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/30 border-transparent"
            }`}
          >
            <Icon className="h-4 w-4" />
            {tab.label}
          </button>
        )
      })}
    </div>
  )

  const onboarding =
    "onboardingCompleted" in activeProfile && activeProfile.onboardingCompleted === false
      ? onboardingProgress(activeProfile)
      : null

  return (
    <div ref={scrollRef} className="w-full h-full min-w-0 overflow-y-auto overflow-x-hidden bg-background">

      {/* Hero — image at top, no black space */}
      <div ref={heroRef} className="w-full pb-4">
        <ProfileHeader
          profile={{ ...activeProfile, username: displayName }}
          onShare={() => handleShare()}
        />
      </div>

      {/* Complete onboarding — compact banner, disappears when completed */}
      {onboarding && (
        <div className="px-8 pb-5">
          <Link
            href="/onboarding?from=profile"
            className="group flex w-full max-w-md items-center gap-4 rounded-2xl border border-border bg-card px-5 py-4 text-sm text-foreground shadow-sm transition-colors hover:bg-muted"
          >
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-black/5 text-black group-hover:bg-black/10">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <p className="flex items-center gap-2 text-sm font-semibold text-black group-hover:text-foreground">
                Your profile is 76% you
              </p>
              <p className="text-xs text-muted-foreground">
                Finish onboarding so FiktionMaps can get to know you and your stories better.
              </p>
              {activeProfile.interests && activeProfile.interests.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {activeProfile.interests.slice(0, 4).map((interest) => (
                    <span
                      key={interest}
                      className="rounded-full border border-border bg-background/60 px-2.5 py-0.5 text-xs font-medium text-muted-foreground group-hover:border-muted-foreground/70"
                    >
                      {interest}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
          </Link>
        </div>
      )}

      {/* Sticky top bar (avatar + name on scroll, like the rest of the site) */}
      {stickyHeader && (
        <PageStickyBar
          leading={
            <div className="flex items-center gap-3 shrink-0">
              <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
                <Image
                  src={activeProfile.avatar || DEFAULT_AVATAR}
                  alt=""
                  width={36}
                  height={36}
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
          }
          title={<span className="text-base font-bold text-foreground">{displayName}</span>}
          trailing={
            <button
              onClick={() => handleShare()}
              className="rounded-lg p-2 transition-colors hover:bg-muted/50"
              aria-label="Share profile"
            >
              <Share2 className="h-4 w-4 text-foreground" />
            </button>
          }
        >
          <div className="flex-1" />
        </PageStickyBar>
      )}

      {/* Tab navigation */}
      <div className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-30">
        {stickyHeader ? (
          <div className="sticky top-12 z-30 bg-background/90 backdrop-blur-md border-b border-border/40">
            <TabBar compact />
          </div>
        ) : (
          <TabBar />
        )}
      </div>

      {/* Page content */}
      <div className="px-8 py-8 space-y-12">
        {/* ── Check-Ins ── */}
        {activeTab === "gallery" && (
          <section className="space-y-8">
            <div>
              <h2 className="text-xl font-bold text-foreground mb-4">
                Visited Locations ({visitedLocations.length})
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                These are the places you have checked in.
              </p>
              <VisitedPlaces locations={visitedLocations} favorites={activeProfile.favoriteLocations} />
            </div>
          </section>
        )}

        {/* ── Contributor ── */}
        {activeTab === "contributor" && (
          <section>
            <h2 className="text-xl font-bold text-foreground mb-6">My Contributions</h2>
            <ContributorData
              uploadedLocations={contributedLocations}
              uploadedFictions={contributedFictions}
              contributedPhotos={contributedPhotos}
            />
          </section>
        )}

        {activeTab === "tours" && (
          <section className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-foreground mb-1">My Tours</h2>
              <p className="text-sm text-muted-foreground">
                Tours created from your account.
              </p>
            </div>

            {myToursWithStops.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-6 text-center">
                <p className="text-base font-semibold text-foreground">You have no tours yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Create your first route and it will appear here.
                </p>
                <Button asChild className="mt-4">
                  <Link href="/tours/create-tour-2">Create Tour</Link>
                </Button>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {myToursWithStops.map(({ tour, stopsCount }) => {
                  const cityLabel = tour.cityId ? cityNameById.get(tour.cityId) ?? tour.cityId : "Multi-city"
                  const creatorName = tour.createdBy?.includes("@")
                    ? tour.createdBy.split("@")[0]
                    : tour.createdBy || "You"
                  return (
                    <article
                      key={tour.id}
                      className="overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-primary/40"
                    >
                      <Link href={`/tours/${tour.slug}`} className="block">
                        <div className="relative h-36 w-full">
                          <Image
                            src={tour.coverImage || "/logo-icon.png"}
                            alt={tour.title}
                            fill
                            sizes="(max-width: 768px) 100vw, 33vw"
                            className="object-cover"
                          />
                        </div>
                        <div className="space-y-2 p-3">
                          <p className="truncate text-sm font-semibold text-foreground">{tour.title}</p>
                          {tour.description && (
                            <p className="line-clamp-2 text-xs text-muted-foreground">{tour.description}</p>
                          )}
                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                            <span>{cityLabel}</span>
                            <span>•</span>
                            <span>{stopsCount} stops</span>
                            <span>•</span>
                            <span>{tour.visibility}</span>
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            by {creatorName}
                          </p>
                        </div>
                      </Link>
                    </article>
                  )
                })}
              </div>
            )}
          </section>
        )}

      </div>
    </div>
  )
}
