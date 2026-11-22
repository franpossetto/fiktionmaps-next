import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { getSessionUserId } from "@/lib/auth/auth.service"
import { getProfileByUsernameForSession } from "@/src/users/infrastructure/next/user.queries"
import { getWishlistCityCollectionForSession } from "@/src/place-wishlists/infrastructure/next/place-wishlist.queries"
import { WishlistCityCollectionView } from "@/components/profile/wishlist-city-collection-view"
import { publicUserProfilePath } from "@/lib/users/public-profile-path"

type PageProps = {
  params: Promise<{ locale: string; username: string }>
  searchParams: Promise<{ city?: string }>
}

export default async function UserWishlistCityPage({ params, searchParams }: PageProps) {
  const sessionUserId = await getSessionUserId()
  const { username: rawUsername } = await params
  const { city: cityParam } = await searchParams
  let username = ""
  try {
    username = decodeURIComponent(rawUsername ?? "").trim()
  } catch {
    username = (rawUsername ?? "").trim()
  }
  if (!username) notFound()

  const nextPath = cityParam?.trim()
    ? `/u/${encodeURIComponent(username)}/wishlist?city=${encodeURIComponent(cityParam.trim())}`
    : `/u/${encodeURIComponent(username)}/wishlist`
  if (!sessionUserId) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`)
  }

  const profile = await getProfileByUsernameForSession(username)
  if (!profile || profile.id !== sessionUserId) notFound()

  const collection = await getWishlistCityCollectionForSession(cityParam?.trim() || null)
  if (!collection) {
    redirect(publicUserProfilePath(username))
  }

  return <WishlistCityCollectionView username={username} collection={collection} />
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "Profile" })
  return {
    title: t("wishlistHeading"),
    robots: { index: false, follow: false },
  }
}
