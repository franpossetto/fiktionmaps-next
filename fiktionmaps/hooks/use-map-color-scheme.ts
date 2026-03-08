"use client"

import { useThemeEffectiveBase } from "@/lib/theme-settings-context"

export function useMapColorScheme(): "dark" | "light" {
  const effectiveBase = useThemeEffectiveBase()
  return effectiveBase
}
