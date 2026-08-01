"use client"

import { useState, useEffect, useCallback } from "react"
import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { useAuth } from "@/context/auth-context"
import { Button } from "@/components/ui/button"
import { FictionContributeLayout } from "@/components/contribute/fiction/fiction-contribute-layout"
import {
  getCurrentUserProfileAction,
  type ProfileWithOnboarding,
} from "@/src/users/infrastructure/next/user.actions"
import type { UserProfile as UserProfileType } from "@/src/users/domain/user.views"
import type { UserRole } from "@/src/users/domain/user.dtos"
import type { City } from "@/src/cities/domain/city.entity"
import type { UserHome } from "@/src/homes/domain/home.entity"
import type { ProfileContributionItem } from "@/src/contributions/domain/contribution.entity"
import type { FictionWithMedia } from "@/src/fictions/domain/fiction.entity"
import type { InterestCatalogItem } from "@/src/interests"

import { HomesProvider } from "./homes-context"
import { HomesTimeline } from "./homes-timeline"
import { ProfileContributionsList } from "./profile-contributions-list"
import {
  contributionActivityDateKey,
  ProfileContributionsHeatmap,
} from "./profile-contributions-heatmap"
import { ProfileLikedFictions } from "./profile-liked-fictions"
import { ProfileInterests, type ProfileInterestTag } from "./profile-interests"
import { ProfileMetaAside } from "./profile-meta-aside"
import { ProfileStatsAside } from "./profile-stats-aside"

interface UserProfileProps {
  profile?: ProfileWithOnboarding | UserProfileType
  initialCities?: City[]
  initialHomes?: UserHome[]
  initialContributions?: ProfileContributionItem[]
  initialLikedFictions?: FictionWithMedia[]
  initialInterests?: ProfileInterestTag[]
  interestCatalog?: InterestCatalogItem[]
  /** Defaults to true (own `/profile` shortcut). */
  isOwnProfile?: boolean
}

const DEFAULT_AVATAR = ""

function isProfileWithExtras(
  profile: ProfileWithOnboarding | UserProfileType | undefined,
): profile is ProfileWithOnboarding {
  return !!profile && "role" in profile && "fppTotal" in profile
}

export function UserProfileComponent({
  profile,
  initialCities,
  initialHomes,
  initialContributions,
  initialLikedFictions,
  initialInterests,
  interestCatalog,
  isOwnProfile = true,
}: UserProfileProps) {
  const { user, setAvatarPreference } = useAuth()
  const t = useTranslations("Profile")

  const [loadedProfile, setLoadedProfile] = useState<ProfileWithOnboarding | UserProfileType | undefined>(
    profile,
  )
  const contributions = initialContributions ?? []
  const likedFictions = initialLikedFictions ?? []
  const [interests, setInterests] = useState(initialInterests ?? [])
  const catalog = interestCatalog ?? []
  const [selectedContributionDateKey, setSelectedContributionDateKey] = useState<string | null>(null)
  const [selectedContributionId, setSelectedContributionId] = useState<string | null>(null)

  const refetchProfile = useCallback(() => {
    if (!isOwnProfile || !user?.id) return
    getCurrentUserProfileAction().then((result) => {
      if (result.data) setLoadedProfile(result.data)
    })
  }, [isOwnProfile, user?.id])

  const handleAvatarUploaded = useCallback(
    (avatarUrl: string, focus: { x: number; y: number }) => {
      setAvatarPreference(avatarUrl)
      setLoadedProfile((current) =>
        current
          ? {
              ...current,
              avatar: avatarUrl,
              ...("onboardingCompleted" in current
                ? { avatarFocus: focus }
                : {}),
            }
          : current
      )
      refetchProfile()
    },
    [refetchProfile, setAvatarPreference]
  )

  const handleAvatarFocusSaved = useCallback((focus: { x: number; y: number }) => {
    setLoadedProfile((current) =>
      current && "onboardingCompleted" in current
        ? { ...current, avatarFocus: focus }
        : current
    )
  }, [])

  const handlePersonalInfoSaved = useCallback((next: ProfileWithOnboarding) => {
    setLoadedProfile(next)
  }, [])

  useEffect(() => {
    if (!isOwnProfile || !user?.id) return
    let cancelled = false

    if (!profile) {
      getCurrentUserProfileAction().then((result) => {
        if (cancelled) return
        if (result.data) {
          setLoadedProfile(result.data)
          return
        }
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
          role: "user",
          fppTotal: 0,
        })
      })
    }

    const onFocus = () => refetchProfile()
    window.addEventListener("focus", onFocus)
    return () => {
      cancelled = true
      window.removeEventListener("focus", onFocus)
    }
  }, [isOwnProfile, user?.id, user?.name, user?.email, user?.avatar, profile, refetchProfile])

  useEffect(() => {
    setLoadedProfile(profile)
  }, [profile])

  useEffect(() => {
    setInterests(initialInterests ?? [])
  }, [initialInterests])

  if (isOwnProfile && !user) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-sm text-muted-foreground">{t("logInToViewProfile")}</p>
        <Button asChild>
          <Link href="/login">{t("logIn")}</Link>
        </Button>
      </div>
    )
  }

  if (!isOwnProfile && !isProfileWithExtras(loadedProfile) && !isProfileWithExtras(profile)) {
    return null
  }

  const activeProfile =
    (isProfileWithExtras(loadedProfile) ? loadedProfile : null) ??
    (isProfileWithExtras(profile) ? profile : null) ??
    (user
      ? {
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
          role: "user" as UserRole,
          fppTotal: 0,
        }
      : null)

  if (!activeProfile) return null

  const displayName = activeProfile.username || user?.name || user?.email?.split("@")[0] || ""
  const role: UserRole = activeProfile.role
  const fppTotal = activeProfile.fppTotal
  const joinYear = activeProfile.joinedDate
    ? new Date(activeProfile.joinedDate).getFullYear()
    : new Date().getFullYear()

  const metaAside = (
    <ProfileMetaAside
      username={displayName}
      avatar={activeProfile.avatar}
      avatarFocus={
        "avatarFocus" in activeProfile ? activeProfile.avatarFocus ?? null : null
      }
      bio={activeProfile.bio}
      fullName={
        "fullName" in activeProfile ? activeProfile.fullName ?? null : null
      }
      gender={"gender" in activeProfile ? activeProfile.gender ?? null : null}
      phone={"phone" in activeProfile ? activeProfile.phone ?? null : null}
      dateOfBirth={
        "dateOfBirth" in activeProfile ? activeProfile.dateOfBirth ?? null : null
      }
      role={role}
      useViewerAvatarPreferences={isOwnProfile}
      canEditAvatar={isOwnProfile}
      canEditPersonalInfo={isOwnProfile}
      onAvatarUploaded={isOwnProfile ? handleAvatarUploaded : undefined}
      onAvatarFocusSaved={isOwnProfile ? handleAvatarFocusSaved : undefined}
      onPersonalInfoSaved={isOwnProfile ? handlePersonalInfoSaved : undefined}
    />
  )

  const interestsAside = (
    <ProfileInterests
      initialSelected={interests}
      catalog={catalog}
      canEdit={isOwnProfile}
      onSaved={setInterests}
    />
  )

  return (
    <HomesProvider initialHomes={isOwnProfile ? initialHomes : []} initialCities={isOwnProfile ? initialCities : []}>
      <FictionContributeLayout
        leftAside={metaAside}
        rightAside={
          <div className="w-full min-w-0 max-w-full space-y-5 pt-1">
            {isOwnProfile ? <HomesTimeline /> : null}
            <ProfileStatsAside
              fppTotal={fppTotal}
              contributionCount={contributions.length}
              joinYear={joinYear}
            />
            {interestsAside}
          </div>
        }
      >
        <div className="w-full min-w-0 px-4 pb-10 sm:px-5">
          <div className="mb-6 min-[900px]:hidden">{metaAside}</div>

          <div className="space-y-8">
            <ProfileContributionsHeatmap
              contributions={contributions}
              selectedDateKey={selectedContributionDateKey}
              onSelectedDateKeyChange={(dateKey) => {
                setSelectedContributionDateKey(dateKey)
                setSelectedContributionId(null)
              }}
              showContributeCta={isOwnProfile}
            />
            <ProfileContributionsList
              contributions={contributions}
              isOwnProfile={isOwnProfile}
              selectedContributionId={selectedContributionId}
              onSelectContribution={(item) => {
                setSelectedContributionId(item.id)
                setSelectedContributionDateKey(contributionActivityDateKey(item.createdAt))
              }}
            />
            <ProfileLikedFictions fictions={likedFictions} />
          </div>

          <div className="mt-8 space-y-5 min-[900px]:hidden">
            {isOwnProfile ? <HomesTimeline /> : null}
            <ProfileStatsAside
              fppTotal={fppTotal}
              contributionCount={contributions.length}
              joinYear={joinYear}
            />
            {interestsAside}
          </div>
        </div>
      </FictionContributeLayout>
    </HomesProvider>
  )
}
