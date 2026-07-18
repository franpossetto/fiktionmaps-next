/**
 * Local storage service for UI preferences.
 * All keys are namespaced; reads/writes are no-ops during SSR.
 */

const PREFIX = "fiktions-ui-"

const KEYS = {
  mapStyle: `${PREFIX}map-style`,
  theme: `${PREFIX}theme`,
  navCollapsed: `${PREFIX}nav-collapsed`,
  placeSelectorCollapsed: `${PREFIX}place-selector-collapsed`,
  selectedCityId: `${PREFIX}selected-city-id`,
  adminViewMode: `${PREFIX}admin-view-mode`,
  recentFictions: `${PREFIX}recent-fictions`,
  recentSearches: `${PREFIX}recent-searches`,
  searchMode: `${PREFIX}search-mode`,
} as const

export type MapStyleValue = "day" | "dawn" | "dusk" | "night"
export type ThemeValue = "dark" | "light"
export type AdminViewMode = "cards" | "table"
export type SearchMode = "map" | "article"

export type RecentSearchItem = {
  readonly id: string
  readonly label: string
  readonly kind: "city" | "fiction"
  readonly fictionType?: string
  readonly href: string
  readonly mode: SearchMode
}

export type RecentFictionItem = {
  readonly id: string
  readonly slug: string | null
  readonly viewedAt: number
}

const RECENT_FICTIONS_LIMIT = 8

const DEFAULT_MAP_STYLE: MapStyleValue = "night"
const DEFAULT_THEME: ThemeValue = "dark"
const DEFAULT_NAV_COLLAPSED = false
const DEFAULT_PLACE_SELECTOR_COLLAPSED = false
const DEFAULT_SELECTED_CITY_ID: string | null = null
const DEFAULT_ADMIN_VIEW_MODE: AdminViewMode = "cards"

function isClient(): boolean {
  return typeof window !== "undefined"
}

function getItem(key: string): string | null {
  if (!isClient()) return null
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function setItem(key: string, value: string): void {
  if (!isClient()) return
  try {
    localStorage.setItem(key, value)
  } catch {
    // quota exceeded or private mode
  }
}

function parseBoolean(raw: string | null, defaultValue: boolean): boolean {
  if (raw === null) return defaultValue
  if (raw === "true") return true
  if (raw === "1") return true
  if (raw === "false") return false
  if (raw === "0") return false
  return defaultValue
}

function parseAdminViewMode(raw: string | null): AdminViewMode {
  if (raw === "table") return "table"
  return DEFAULT_ADMIN_VIEW_MODE
}

function parseMapStyle(raw: string | null): MapStyleValue {
  if (raw === null) return DEFAULT_MAP_STYLE
  const valid: MapStyleValue[] = ["day", "dawn", "dusk", "night"]
  return valid.includes(raw as MapStyleValue) ? (raw as MapStyleValue) : DEFAULT_MAP_STYLE
}

function parseTheme(raw: string | null): ThemeValue {
  if (raw === null) return DEFAULT_THEME
  return raw === "light" ? "light" : "dark"
}

/** Map style (day, dawn, dusk, night). */
export const mapStyleStorage = {
  get(): MapStyleValue {
    return parseMapStyle(getItem(KEYS.mapStyle))
  },
  set(value: MapStyleValue): void {
    setItem(KEYS.mapStyle, value)
  },
  getDefault(): MapStyleValue {
    return DEFAULT_MAP_STYLE
  },
}

/** App theme (dark or light). */
export const themeStorage = {
  get(): ThemeValue {
    return parseTheme(getItem(KEYS.theme))
  },
  set(value: ThemeValue): void {
    setItem(KEYS.theme, value)
  },
  getDefault(): ThemeValue {
    return DEFAULT_THEME
  },
}

/** Whether the main nav (e.g. sidebar) is collapsed. */
export const navCollapsedStorage = {
  get(): boolean {
    return parseBoolean(getItem(KEYS.navCollapsed), DEFAULT_NAV_COLLAPSED)
  },
  set(collapsed: boolean): void {
    setItem(KEYS.navCollapsed, collapsed ? "true" : "false")
  },
  getDefault(): boolean {
    return DEFAULT_NAV_COLLAPSED
  },
}

/** Whether the place selector (e.g. city/place panel) is collapsed. */
export const placeSelectorCollapsedStorage = {
  get(): boolean {
    return parseBoolean(getItem(KEYS.placeSelectorCollapsed), DEFAULT_PLACE_SELECTOR_COLLAPSED)
  },
  set(collapsed: boolean): void {
    setItem(KEYS.placeSelectorCollapsed, collapsed ? "true" : "false")
  },
  getDefault(): boolean {
    return DEFAULT_PLACE_SELECTOR_COLLAPSED
  },
}

/** Last selected city id (for map page). */
export const selectedCityIdStorage = {
  get(): string | null {
    const raw = getItem(KEYS.selectedCityId)
    if (raw === null || raw === "") return DEFAULT_SELECTED_CITY_ID
    return raw
  },
  set(cityId: string | null): void {
    if (cityId === null || cityId === "") {
      if (isClient()) {
        try {
          localStorage.removeItem(KEYS.selectedCityId)
        } catch {
          // ignore
        }
      }
      return
    }
    setItem(KEYS.selectedCityId, cityId)
  },
  getDefault(): string | null {
    return DEFAULT_SELECTED_CITY_ID
  },
}

/** Admin content view mode for all tabs (cards or table). */
export const adminViewModeStorage = {
  get(): AdminViewMode {
    return parseAdminViewMode(getItem(KEYS.adminViewMode))
  },
  set(value: AdminViewMode): void {
    setItem(KEYS.adminViewMode, value)
  },
  getDefault(): AdminViewMode {
    return DEFAULT_ADMIN_VIEW_MODE
  },
}

function parseRecentFictions(raw: string | null): RecentFictionItem[] {
  if (raw === null) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (item): item is RecentFictionItem =>
        item !== null &&
        typeof item === "object" &&
        typeof (item as Record<string, unknown>).id === "string" &&
        ((item as Record<string, unknown>).id as string).length > 0 &&
        (
          (item as Record<string, unknown>).slug === null ||
          typeof (item as Record<string, unknown>).slug === "string"
        ) &&
        typeof (item as Record<string, unknown>).viewedAt === "number",
    )
  } catch {
    return []
  }
}

/** Recently visited fictions (client-only, persisted across sessions). */
export const recentFictionsStorage = {
  get(): readonly RecentFictionItem[] {
    return parseRecentFictions(getItem(KEYS.recentFictions))
  },
  add({ id, slug }: { id: string; slug?: string | null }): void {
    const current = parseRecentFictions(getItem(KEYS.recentFictions))
    const deduped = current.filter((item) => item.id !== id)
    const updated = [
      { id, slug: slug ?? null, viewedAt: Date.now() },
      ...deduped,
    ].slice(0, RECENT_FICTIONS_LIMIT)
    setItem(KEYS.recentFictions, JSON.stringify(updated))
  },
  clear(): void {
    if (!isClient()) return
    try {
      localStorage.removeItem(KEYS.recentFictions)
    } catch {
      // ignore
    }
  },
  getDefault(): readonly RecentFictionItem[] {
    return []
  },
}

const MAX_RECENT_SEARCHES = 5

function parseRecentSearches(raw: string | null): RecentSearchItem[] {
  if (raw === null) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (item): item is RecentSearchItem =>
        item !== null &&
        typeof item === "object" &&
        typeof (item as Record<string, unknown>).id === "string" &&
        typeof (item as Record<string, unknown>).label === "string" &&
        ((item as Record<string, unknown>).kind === "city" ||
          (item as Record<string, unknown>).kind === "fiction") &&
        typeof (item as Record<string, unknown>).href === "string" &&
        ((item as Record<string, unknown>).mode === "map" ||
          (item as Record<string, unknown>).mode === "article"),
    )
  } catch {
    return []
  }
}

/** Recently used home-search entries (cities + fictions), persisted across sessions. */
export const recentSearchesStorage = {
  get(): readonly RecentSearchItem[] {
    return parseRecentSearches(getItem(KEYS.recentSearches))
  },
  add(item: RecentSearchItem): void {
    const current = parseRecentSearches(getItem(KEYS.recentSearches))
    const next = [item, ...current.filter((r) => r.id !== item.id)].slice(0, MAX_RECENT_SEARCHES)
    setItem(KEYS.recentSearches, JSON.stringify(next))
  },
  remove(id: string): void {
    const current = parseRecentSearches(getItem(KEYS.recentSearches))
    setItem(KEYS.recentSearches, JSON.stringify(current.filter((r) => r.id !== id)))
  },
  getDefault(): readonly RecentSearchItem[] {
    return []
  },
}

/** Search mode preference for the home search bar ("map" or "article"). */
export const searchModeStorage = {
  get(): SearchMode {
    const raw = getItem(KEYS.searchMode)
    return raw === "article" ? "article" : "map"
  },
  set(mode: SearchMode): void {
    setItem(KEYS.searchMode, mode)
  },
  getDefault(): SearchMode {
    return "map"
  },
}

/** Single entry point for all UI local storage. */
export const localStorageService = {
  mapStyle: mapStyleStorage,
  theme: themeStorage,
  navCollapsed: navCollapsedStorage,
  placeSelectorCollapsed: placeSelectorCollapsedStorage,
  selectedCityId: selectedCityIdStorage,
  adminViewMode: adminViewModeStorage,
  recentFictions: recentFictionsStorage,
  recentSearches: recentSearchesStorage,
  searchMode: searchModeStorage,
}
