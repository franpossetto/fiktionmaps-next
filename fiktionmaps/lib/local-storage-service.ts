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
} as const

export type MapStyleValue = "day" | "dawn" | "dusk" | "night"
export type ThemeValue = "dark" | "light"

const DEFAULT_MAP_STYLE: MapStyleValue = "night"
const DEFAULT_THEME: ThemeValue = "dark"
const DEFAULT_NAV_COLLAPSED = false
const DEFAULT_PLACE_SELECTOR_COLLAPSED = false
const DEFAULT_SELECTED_CITY_ID: string | null = null

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

/** Single entry point for all UI local storage. */
export const localStorageService = {
  mapStyle: mapStyleStorage,
  theme: themeStorage,
  navCollapsed: navCollapsedStorage,
  placeSelectorCollapsed: placeSelectorCollapsedStorage,
  selectedCityId: selectedCityIdStorage,
}
