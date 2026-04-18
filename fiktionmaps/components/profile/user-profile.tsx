"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Link } from "@/i18n/navigation"
import { useAuth } from "@/context/auth-context"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import {
  getCurrentUserProfileAction,
  type ProfileWithOnboarding,
} from "@/src/users/infrastructure/next/user.actions"
import type { UserProfile as UserProfileType } from "@/src/users/domain/user.views"
import type { City } from "@/src/cities/domain/city.entity"
import type { UserHome } from "@/src/homes/domain/home.entity"
import {
  getUserCityCheckinsAction,
  getUserPlaceCheckinsEnrichedAction,
  type EnrichedPlaceCheckin,
  type CityCheckin,
} from "@/src/checkins/infrastructure/next/checkin.actions"
import {
  getProfileScenesPreviewAction,
  type ProfileArticlePreview,
  type ProfileScenePreview,
} from "@/src/scenes/infrastructure/next/profile-scene-previews.actions"

import { ProfileHeader } from "./profile-header"
import { HomesProvider } from "./homes-context"
import { HomesTimeline } from "./homes-timeline"
import { CheckinsList } from "./checkins-list"
import {
  PlacesSection,
  ScenesSection,
  ArticlesSection,
  SidebarSectionLoading,
} from "./profile-sidebar-sections"

interface UserProfileProps {
  profile?: UserProfileType
  /** From server via getAllCities() so the profile avoids a client /api/cities round-trip. */
  initialCities?: City[]
  /** From server to avoid first client refetch for profile scenes. */
  initialScenePreviews?: ProfileScenePreview[]
  /** From server to avoid first client refetch for profile checkins. */
  initialCheckinBundle?: {
    places: EnrichedPlaceCheckin[]
    cities: CityCheckin[]
  }
  /** From server to avoid first client refetch for homes. */
  initialHomes?: UserHome[]
}

const DEFAULT_AVATAR = "/logo-icon.png"

const EMPTY_ARTICLES: ProfileArticlePreview[] = []

export function UserProfileComponent({
  profile,
  initialCities,
  initialScenePreviews,
  initialCheckinBundle,
  initialHomes,
}: UserProfileProps) {
  const { user } = useAuth()
  const t = useTranslations("Profile")

  const [loadedProfile, setLoadedProfile] = useState<ProfileWithOnboarding | UserProfileType | undefined>(profile)
  const [checkinBundle, setCheckinBundle] = useState<{
    places: EnrichedPlaceCheckin[]
    cities: CityCheckin[]
  } | null>(() => initialCheckinBundle ?? null)
  const [scenePreviews, setScenePreviews] = useState<ProfileScenePreview[]>(() => initialScenePreviews ?? [])
  const [cityMap, setCityMap] = useState<Map<string, City>>(() =>
    initialCities?.length
      ? new Map(initialCities.map((c) => [c.id, c]))
      : new Map()
  )

  const refetchProfile = useCallback(() => {
    if (!user?.id) return
    getCurrentUserProfileAction().then((result) => {
      if (result.data) setLoadedProfile(result.data)
    })
  }, [user?.id])

  useEffect(() => {
    if (!user?.id) return
    let cancelled = false

    if (!profile) {
      getCurrentUserProfileAction().then((result) => {
        if (cancelled) return
        if (result.data) {
          setLoadedProfile(result.data)
          return
        }
        // Keep UI responsive even if profile row is missing; render a local fallback.
        setLoadedProfile({
          id: user.id,
          username: user.name || user.email?.split("@")[0] || "",
          avatar: user.avatar || DEFAULT_AVATAR,
          bio: "",
          interests: [],
          joinedDate: new Date().toISOString(),
          visitedLocations: [],
          checkIns: [],
          favoriteLocations: [],
          stats: { totalVisits: 0, locationsExplored: 0, frictionsConnected: 0 },
          onboardingCompleted: false,
        })
      })
    }

    const placesPromise =
      initialCheckinBundle === undefined
        ? getUserPlaceCheckinsEnrichedAction().then((res) => res.data ?? [])
        : Promise.resolve(initialCheckinBundle.places)
    const citiesPromise =
      initialCheckinBundle === undefined
        ? getUserCityCheckinsAction().then((res) => res.data ?? [])
        : Promise.resolve(initialCheckinBundle.cities)
    const scenesPromise =
      initialScenePreviews === undefined
        ? getProfileScenesPreviewAction()
        : Promise.resolve(initialScenePreviews)

    Promise.all([placesPromise, citiesPromise, scenesPromise]).then(
      ([places, cities, scenes]) => {
        if (cancelled) return
        setCheckinBundle({
          places,
          cities,
        })
        setScenePreviews(scenes)
      }
    )

    const onFocus = () => refetchProfile()
    window.addEventListener("focus", onFocus)
    return () => {
      cancelled = true
      window.removeEventListener("focus", onFocus)
    }
  }, [
    user?.id,
    user?.name,
    user?.email,
    user?.avatar,
    profile,
    refetchProfile,
    initialCities?.length,
    initialScenePreviews,
    initialCheckinBundle,
  ])

  if (!user) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-sm text-muted-foreground">{t("logInToViewProfile")}</p>
        <Button asChild>
          <Link href="/login">{t("logIn")}</Link>
        </Button>
      </div>
    )
  }

  const activeProfile =
    profile ??
    loadedProfile ?? {
      id: user.id,
      username: user.name || user.email?.split("@")[0] || "",
      avatar: user.avatar || DEFAULT_AVATAR,
      bio: "",
      interests: [],
      joinedDate: new Date().toISOString(),
      visitedLocations: [],
      checkIns: [],
      favoriteLocations: [],
      stats: { totalVisits: 0, locationsExplored: 0, frictionsConnected: 0 },
      onboardingCompleted: false,
    }
  const displayName = activeProfile.username || user?.name || user?.email?.split("@")[0] || ""

  return (
    <UserProfileBody
      activeProfile={activeProfile}
      displayName={displayName}
      checkinBundle={checkinBundle}
      scenePreviews={scenePreviews}
      articlePreviews={EMPTY_ARTICLES}
      cityMap={cityMap}
      initialHomes={initialHomes}
      initialCities={initialCities}
    />
  )
}

function UserProfileBody({
  activeProfile,
  displayName,
  checkinBundle,
  scenePreviews,
  articlePreviews,
  cityMap,
  initialHomes,
  initialCities,
}: {
  activeProfile: UserProfileType | ProfileWithOnboarding
  displayName: string
  checkinBundle: { places: EnrichedPlaceCheckin[]; cities: CityCheckin[] } | null
  scenePreviews: ProfileScenePreview[]
  articlePreviews: ProfileArticlePreview[]
  cityMap: Map<string, City>
  initialHomes?: UserHome[]
  initialCities?: City[]
}) {
  const t = useTranslations("Profile")
  const tCheckins = useTranslations("Checkins")
  const [stickyHeader, setStickyHeader] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const heroRef = useRef<HTMLDivElement>(null)

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

  return (
    <div ref={scrollRef} className="w-full h-full min-w-0 overflow-y-auto overflow-x-hidden bg-background">
      {stickyHeader && (
        <div className="sticky top-0 z-40 border-b border-border/40 bg-background/95 backdrop-blur-md">
          <div className="mx-auto flex h-11 max-w-7xl items-center px-5">
            <span className="truncate text-sm font-semibold text-foreground">{displayName}</span>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-7xl">
        <div ref={heroRef}>
          <ProfileHeader
            profile={{ ...activeProfile, username: displayName }}
            onShare={() => {
              if (navigator.share)
                navigator.share({ title: "FiktionMaps", text: `Check out ${displayName}'s profile` })
            }}
          />
        </div>

        <HomesProvider initialHomes={initialHomes} initialCities={initialCities}>
          <div className="mt-6 px-5 pb-10">
            <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-[minmax(0,7fr)_minmax(0,3fr)]">
              <div className="min-w-0 space-y-6">
                <div className="space-y-3">
                  <PlacesSection checkins={checkinBundle?.places ?? []} cityMap={cityMap} />
                  <ScenesSection rows={scenePreviews} />
                  <ArticlesSection rows={articlePreviews} />
                  {checkinBundle ? (
                    <CheckinsList
                      placeCheckins={checkinBundle.places}
                      cityCheckins={checkinBundle.cities}
                      cityMap={cityMap}
                    />
                  ) : (
                    <SidebarSectionLoading title={t("checkIns")} message={tCheckins("loadingCheckins")} />
                  )}
                </div>
              </div>
              <section className="min-w-0 space-y-3">
                <HomesTimeline />
              </section>
            </div>
          </div>
        </HomesProvider>
      </div>
    </div>
  )
}
