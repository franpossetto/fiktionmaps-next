import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import { getSessionUserId } from "@/lib/auth/auth.service"
import type { City } from "@/src/cities/domain/city.entity"
import { getAllCitiesCached } from "@/src/cities/infrastructure/next/city.queries"
import { getProfileContributionsForViewer } from "@/src/contributions/infrastructure/next/contribution.queries"
import { getLikedFictionsForUserCached } from "@/src/fiction-likes/infrastructure/next/fiction-likes.queries"
import type { UserHome } from "@/src/homes/domain/home.entity"
import { getUserHomesAction } from "@/src/homes/infrastructure/next/home.actions"
import { getUserInterestTagsForSession } from "@/src/user-interests/infrastructure/next/user-interests.queries"
import { getInterestCatalogCached } from "@/src/interests/infrastructure/next/interest.queries"
import { getProfileByUsernameForSession } from "@/src/users/infrastructure/next/user.queries"
import { UserProfileComponent } from "@/components/profile/user-profile"

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
}

type PageProps = {
  params: Promise<{ locale: string; username: string }>
}

export default async function UserPublicProfilePage({ params }: PageProps) {
  const sessionUserId = await getSessionUserId()
  if (!sessionUserId) redirect("/login")

  const { locale, username: rawUsername } = await params
  let username = ""
  try {
    username = decodeURIComponent(rawUsername ?? "").trim()
  } catch {
    username = (rawUsername ?? "").trim()
  }
  if (!username) notFound()

  const profile = await getProfileByUsernameForSession(username)
  if (!profile) notFound()

  const isOwnProfile = profile.id === sessionUserId
  const [contributions, homesRes, cities, likedFictions, interests, interestCatalog] =
    await Promise.all([
      getProfileContributionsForViewer(profile.id),
      isOwnProfile
        ? getUserHomesAction()
        : Promise.resolve({ data: [] as UserHome[], error: null }),
      isOwnProfile ? getAllCitiesCached() : Promise.resolve([] as City[]),
      getLikedFictionsForUserCached(profile.id),
      getUserInterestTagsForSession(profile.id, locale),
      isOwnProfile ? getInterestCatalogCached(locale) : Promise.resolve([]),
    ])

  return (
    <UserProfileComponent
      profile={profile}
      isOwnProfile={isOwnProfile}
      initialCities={cities}
      initialHomes={homesRes.data ?? []}
      initialContributions={contributions}
      initialLikedFictions={likedFictions}
      initialInterests={interests}
      interestCatalog={interestCatalog}
    />
  )
}
