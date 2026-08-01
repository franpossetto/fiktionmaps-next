/** Locale-agnostic path for a user’s public profile (auth required at the edge). */
export function publicUserProfilePath(username: string): string {
  const trimmed = username.trim()
  return `/u/${encodeURIComponent(trimmed)}`
}
