"use client"

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import {
  type ThemeSettings,
  type ThemeBase,
  type StyleVariant,
  type ThemeMode,
  type TimeOfDay,
  THEME_STORAGE_KEY,
  defaultThemeSettings,
  getManualThemeClass,
  getRealtimeThemeClass,
  getTimeOfDayNow,
} from "./theme-settings"

export type MapStyleKey = "day" | "dawn" | "dusk" | "night"

type ThemeSettingsContextValue = {
  settings: ThemeSettings
  setBase: (base: ThemeBase) => void
  setStyleVariant: (v: StyleVariant) => void
  setMode: (mode: ThemeMode) => void
  /** Set manual theme in one go (mode=manual + base + styleVariant); saves and applies immediately */
  setManualStyle: (base: ThemeBase, styleVariant: StyleVariant) => void
  /** Apply and save full settings (e.g. from Settings page Save button); then navigate back */
  applyAndSave: (next: ThemeSettings) => void
  /** Current time of day when mode is realtime */
  timeOfDay: TimeOfDay | null
  /** Resolved theme base for UI (e.g. map): light vs dark */
  effectiveBase: ThemeBase
  /** Resolved map style for Mapbox: day, dawn, dusk, night */
  effectiveMapStyle: MapStyleKey
}

const ThemeSettingsContext = createContext<ThemeSettingsContextValue | null>(null)

function loadSettings(): ThemeSettings {
  if (typeof window === "undefined") return defaultThemeSettings
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY)
    if (!raw) return defaultThemeSettings
    const parsed = JSON.parse(raw) as Partial<ThemeSettings>
    return {
      mode: parsed.mode ?? defaultThemeSettings.mode,
      base: parsed.base ?? defaultThemeSettings.base,
      styleVariant: parsed.styleVariant ?? defaultThemeSettings.styleVariant,
    }
  } catch {
    return defaultThemeSettings
  }
}

function saveSettings(settings: ThemeSettings) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // ignore
  }
}

function isDarkThemeClass(themeClass: string): boolean {
  return (
    themeClass.startsWith("theme-dark-") ||
    themeClass === "theme-realtime-evening" ||
    themeClass === "theme-realtime-night"
  )
}

/** Apply theme class to document. Dawn/dusk only affect the map; app UI always uses light or dark. */
function applyThemeToDocument(settings: ThemeSettings, timeOfDay: TimeOfDay | null) {
  const root = document.documentElement
  const existing = Array.from(root.classList).filter(
    (c) =>
      c.startsWith("theme-") &&
      (c.startsWith("theme-light-") ||
        c.startsWith("theme-dark-") ||
        c.startsWith("theme-realtime-"))
  )
  existing.forEach((c) => root.classList.remove(c))
  let themeClass: string
  if (settings.mode === "realtime") {
    const tod = timeOfDay ?? getTimeOfDayNow()
    themeClass = getRealtimeThemeClass(tod)
  } else {
    // Manual: only base (light/dark) affects app theme; styleVariant (day/dawn/dusk/night) affects map only
    themeClass = getManualThemeClass(settings.base, "1")
  }
  root.classList.add(themeClass)
  if (isDarkThemeClass(themeClass)) {
    root.classList.add("dark")
  } else {
    root.classList.remove("dark")
  }
}

export function ThemeSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettingsState] = useState<ThemeSettings>(defaultThemeSettings)
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay | null>(null)

  const setBase = useCallback((base: ThemeBase) => {
    setSettingsState((prev) => {
      const next = { ...prev, base }
      saveSettings(next)
      return next
    })
  }, [])

  const setStyleVariant = useCallback((styleVariant: StyleVariant) => {
    setSettingsState((prev) => {
      const next = { ...prev, styleVariant }
      saveSettings(next)
      return next
    })
  }, [])

  const setMode = useCallback((mode: ThemeMode) => {
    setSettingsState((prev) => {
      const next = { ...prev, mode }
      saveSettings(next)
      applyThemeToDocument(next, mode === "realtime" ? getTimeOfDayNow() : null)
      return next
    })
  }, [])

  const setManualStyle = useCallback((base: ThemeBase, styleVariant: StyleVariant) => {
    setSettingsState((prev) => {
      const next = { ...prev, mode: "manual" as const, base, styleVariant }
      saveSettings(next)
      applyThemeToDocument(next, null)
      return next
    })
  }, [])

  const applyAndSave = useCallback((next: ThemeSettings) => {
    saveSettings(next)
    applyThemeToDocument(next, next.mode === "realtime" ? getTimeOfDayNow() : null)
    setSettingsState(next)
  }, [])

  // Hydrate from localStorage and apply theme class to document
  useEffect(() => {
    setSettingsState(loadSettings())
  }, [])

  useEffect(() => {
    if (settings.mode === "realtime") {
      const tod = getTimeOfDayNow()
      setTimeOfDay(tod)
      applyThemeToDocument(settings, tod)
    } else {
      setTimeOfDay(null)
      applyThemeToDocument(settings, null)
    }
  }, [settings.mode, settings.base, settings.styleVariant, timeOfDay])

  // Realtime: update time of day every minute
  useEffect(() => {
    if (settings.mode !== "realtime") return
    const tick = () => setTimeOfDay(getTimeOfDayNow())
    const id = setInterval(tick, 60_000)
    return () => clearInterval(id)
  }, [settings.mode])

  const effectiveBase: ThemeBase = useMemo(() => {
    if (settings.mode === "manual") return settings.base
    const tod = timeOfDay ?? getTimeOfDayNow()
    return tod === "day" || tod === "afternoon" ? "light" : "dark"
  }, [settings.mode, settings.base, timeOfDay])

  const effectiveMapStyle: MapStyleKey = useMemo(() => {
    if (settings.mode === "manual") {
      if (settings.base === "light") return settings.styleVariant === "1" ? "day" : "dawn"
      return settings.styleVariant === "1" ? "night" : "dusk"
    }
    const tod = timeOfDay ?? getTimeOfDayNow()
    if (tod === "day") return "day"
    if (tod === "afternoon") return "dawn"
    if (tod === "evening") return "dusk"
    return "night"
  }, [settings.mode, settings.base, settings.styleVariant, timeOfDay])

  const value: ThemeSettingsContextValue = useMemo(
    () => ({
      settings,
      setBase,
      setStyleVariant,
      setMode,
      setManualStyle,
      applyAndSave,
      timeOfDay,
      effectiveBase,
      effectiveMapStyle,
    }),
    [settings, setBase, setStyleVariant, setMode, setManualStyle, applyAndSave, timeOfDay, effectiveBase, effectiveMapStyle]
  )

  return (
    <ThemeSettingsContext.Provider value={value}>
      {children}
    </ThemeSettingsContext.Provider>
  )
}

export function useThemeSettings() {
  const ctx = useContext(ThemeSettingsContext)
  if (!ctx) throw new Error("useThemeSettings must be used within ThemeSettingsProvider")
  return ctx
}

/** For map and other components that only need light/dark */
export function useThemeEffectiveBase(): ThemeBase {
  const ctx = useContext(ThemeSettingsContext)
  if (!ctx) return "dark"
  return ctx.effectiveBase
}

/** For map: returns day/dawn/dusk/night so the map can use the matching Mapbox style URL */
export function useMapStyle(): MapStyleKey {
  const ctx = useContext(ThemeSettingsContext)
  if (!ctx) return "night"
  return ctx.effectiveMapStyle
}
