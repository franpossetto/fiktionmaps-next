import type { Metadata } from "next"
import { redirect } from "@/i18n/navigation"
import { getAllCitiesCached } from "@/src/cities/infrastructure/next/city.queries"
import { getCurrentUserProfileAction } from "@/src/users/infrastructure/next/user.actions"
import { getUserHomesAction } from "@/src/homes/infrastructure/next/home.actions"
import { getCurrentUserContributions } from "@/src/contributions/infrastructure/next/contribution.queries"
import { getLikedFictionsForUserCached } from "@/src/fiction-likes/infrastructure/next/fiction-likes.queries"
import { getUserInterestTagsForSession } from "@/src/user-interests/infrastructure/next/user-interests.queries"
import { getInterestCatalogCached } from "@/src/interests/infrastructure/next/interest.queries"
import { publicUserProfilePath } from "@/lib/users/public-profile-path"
import { UserProfileComponent } from "@/components/profile/user-profile"

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const [cities, profileRes, homesRes, contributions] = await Promise.all([
    getAllCitiesCached(),
    getCurrentUserProfileAction(),
    getUserHomesAction(),
    getCurrentUserContributions(),
  ])

  const username = profileRes.data?.username?.trim()
  if (username) {
    redirect({ href: publicUserProfilePath(username), locale })
  }

  const likedFictions = profileRes.data?.id
    ? await getLikedFictionsForUserCached(profileRes.data.id)
    : []
  const interests = profileRes.data?.id
    ? await getUserInterestTagsForSession(profileRes.data.id, locale)
    : []
  const interestCatalog = await getInterestCatalogCached(locale)

  return (
    <UserProfileComponent
      profile={profileRes.data ?? undefined}
      isOwnProfile
      initialCities={cities}
      initialHomes={homesRes.data ?? []}
      initialContributions={contributions}
      initialLikedFictions={likedFictions}
      initialInterests={interests}
      interestCatalog={interestCatalog}
    />
  )
}
