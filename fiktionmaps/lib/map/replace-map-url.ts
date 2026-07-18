/**
 * Update the map query string without Next.js router navigation.
 * `router.replace` aborts in-flight server actions and surfaces "Failed to fetch".
 */
export function replaceMapUrlSearch(search: string): void {
  if (typeof window === "undefined") return
  const normalized = search.replace(/^\?/, "")
  const next = normalized
    ? `${window.location.pathname}?${normalized}`
    : window.location.pathname
  const current = `${window.location.pathname}${window.location.search}`
  if (current === next) return
  window.history.replaceState(window.history.state, "", next)
}
