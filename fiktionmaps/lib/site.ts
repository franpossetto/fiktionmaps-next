const DEFAULT_SITE_URL = "https://fiktions.com"

/**
 * Public site origin (no trailing slash). Used for sitemap, robots and canonicals.
 * Set `NEXT_PUBLIC_SITE_URL` in production.
 */
export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (!raw) return DEFAULT_SITE_URL
  return raw.replace(/\/+$/, "")
}
