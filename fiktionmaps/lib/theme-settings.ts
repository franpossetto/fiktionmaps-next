/**
 * Theme settings: manual (light/dark + map style day/dawn/dusk/night) or realtime (by local time).
 * App UI theme is only light or dark; dawn/dusk affect the map style only.
 */

export type ThemeBase = "light" | "dark"
/** 1 = day (light) / night (dark), 2 = dawn (light) / dusk (dark). Only affects map style, not app theme. */
export type StyleVariant = "1" | "2"
export type TimeOfDay = "day" | "afternoon" | "evening" | "night"

export type ThemeMode = "manual" | "realtime"

export interface ThemeSettings {
  mode: ThemeMode
  base: ThemeBase
  styleVariant: StyleVariant
}

export const THEME_STORAGE_KEY = "fiktions-theme-settings"

export const defaultThemeSettings: ThemeSettings = {
  mode: "manual",
  base: "dark",
  styleVariant: "1",
}

/** Class applied to <html> for manual themes */
export function getManualThemeClass(base: ThemeBase, style: StyleVariant): string {
  return `theme-${base}-${style}`
}

/** Class applied to <html> for realtime (time-of-day) themes */
export function getRealtimeThemeClass(time: TimeOfDay): string {
  return `theme-realtime-${time}`
}

/** Derive time of day from local hour (0–23). You can replace thresholds to match your 4 modes. */
export function getTimeOfDayFromHour(hour: number): TimeOfDay {
  if (hour >= 5 && hour < 12) return "day"
  if (hour >= 12 && hour < 17) return "afternoon"
  if (hour >= 17 && hour < 21) return "evening"
  return "night"
}

export function getTimeOfDayNow(): TimeOfDay {
  return getTimeOfDayFromHour(new Date().getHours())
}
