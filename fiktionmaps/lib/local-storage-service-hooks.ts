"use client"

import { useState, useEffect, useCallback } from "react"
import {
  localStorageService,
  type MapStyleValue,
  type ThemeValue,
  type AdminViewMode,
  type RecentFictionItem,
} from "./local-storage-service"

/**
 * Returns [value, setValue] that are synced with localStorage.
 * Initial state is from storage (or default) after mount; updates are persisted.
 */
export function useMapStyleStorage(): [MapStyleValue, (v: MapStyleValue) => void] {
  const [value, setValueState] = useState<MapStyleValue>(localStorageService.mapStyle.getDefault)

  useEffect(() => {
    setValueState(localStorageService.mapStyle.get())
  }, [])

  const setValue = useCallback((v: MapStyleValue) => {
    setValueState(v)
    localStorageService.mapStyle.set(v)
  }, [])

  return [value, setValue]
}

export function useThemeStorage(): [ThemeValue, (v: ThemeValue) => void] {
  const [value, setValueState] = useState<ThemeValue>(localStorageService.theme.getDefault)

  useEffect(() => {
    setValueState(localStorageService.theme.get())
  }, [])

  const setValue = useCallback((v: ThemeValue) => {
    setValueState(v)
    localStorageService.theme.set(v)
  }, [])

  return [value, setValue]
}

export function useNavCollapsedStorage(): [boolean, (v: boolean) => void] {
  const [value, setValueState] = useState<boolean>(localStorageService.navCollapsed.getDefault)

  useEffect(() => {
    setValueState(localStorageService.navCollapsed.get())
  }, [])

  const setValue = useCallback((v: boolean) => {
    setValueState(v)
    localStorageService.navCollapsed.set(v)
  }, [])

  return [value, setValue]
}

export function usePlaceSelectorCollapsedStorage(): [boolean, (v: boolean) => void] {
  const [value, setValueState] = useState<boolean>(
    localStorageService.placeSelectorCollapsed.getDefault,
  )

  useEffect(() => {
    setValueState(localStorageService.placeSelectorCollapsed.get())
  }, [])

  const setValue = useCallback((v: boolean) => {
    setValueState(v)
    localStorageService.placeSelectorCollapsed.set(v)
  }, [])

  return [value, setValue]
}

export function useSelectedCityIdStorage(): [string | null, (v: string | null) => void] {
  const [value, setValueState] = useState<string | null>(
    localStorageService.selectedCityId.getDefault,
  )

  useEffect(() => {
    setValueState(localStorageService.selectedCityId.get())
  }, [])

  const setValue = useCallback((v: string | null) => {
    setValueState(v)
    localStorageService.selectedCityId.set(v)
  }, [])

  return [value, setValue]
}

export function useAdminViewModeStorage(): [AdminViewMode, (v: AdminViewMode) => void] {
  const [value, setValueState] = useState<AdminViewMode>(
    localStorageService.adminViewMode.getDefault,
  )

  useEffect(() => {
    setValueState(localStorageService.adminViewMode.get())
  }, [])

  const setValue = useCallback((v: AdminViewMode) => {
    setValueState(v)
    localStorageService.adminViewMode.set(v)
  }, [])

  return [value, setValue]
}

export function useRecentFictionsStorage(): {
  items: readonly RecentFictionItem[]
  add: (args: { id: string; slug?: string | null }) => void
  clear: () => void
} {
  const [items, setItems] = useState<readonly RecentFictionItem[]>(
    localStorageService.recentFictions.getDefault,
  )

  useEffect(() => {
    setItems(localStorageService.recentFictions.get())
  }, [])

  const add = useCallback(({ id, slug }: { id: string; slug?: string | null }) => {
    localStorageService.recentFictions.add({ id, slug })
    setItems(localStorageService.recentFictions.get())
  }, [])

  const clear = useCallback(() => {
    localStorageService.recentFictions.clear()
    setItems([])
  }, [])

  return { items, add, clear }
}
