"use client"

import type { MapLocationPanel } from "@/src/places/application/get-map-location-panel.usecase"
import { getMapLocationPanelAction } from "@/src/places/infrastructure/next/place.actions"
import { isUuidString } from "@/lib/validation/primitives"

const cache = new Map<string, Promise<MapLocationPanel>>()

function emptyPanel(): MapLocationPanel {
  return { place: null, scenes: [], contributors: [] }
}

/** In-flight + settled dedupe so pin click can prefetch before the sidebar mounts. */
export function loadMapLocationPanel(placeId: string): Promise<MapLocationPanel> {
  if (!isUuidString(placeId)) return Promise.resolve(emptyPanel())
  const existing = cache.get(placeId)
  if (existing) return existing
  const promise = getMapLocationPanelAction(placeId).catch(() => emptyPanel())
  cache.set(placeId, promise)
  return promise
}

export function prefetchMapLocationPanel(placeId: string): void {
  void loadMapLocationPanel(placeId)
}
