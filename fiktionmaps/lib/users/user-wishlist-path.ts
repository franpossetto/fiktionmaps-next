import { publicUserProfilePath } from "@/lib/users/public-profile-path"

/** Owner wishlist collection. `citySlug` filters to that city. */
export function userWishlistPath(username: string, citySlug?: string | null): string {
  const base = `${publicUserProfilePath(username)}/wishlist`
  const slug = citySlug?.trim()
  if (!slug) return base
  return `${base}?city=${encodeURIComponent(slug)}`
}
