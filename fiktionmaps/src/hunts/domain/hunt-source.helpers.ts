export function normalizeHuntSourceUrl(url: string): string {
  try {
    const u = new URL(url.trim())
    return `${u.protocol}//${u.host.toLowerCase()}${u.pathname.replace(/\/$/, "")}${u.search}`
  } catch {
    return url.trim().toLowerCase()
  }
}
