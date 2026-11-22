"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import {
  planWishlistCityTour,
  type WishlistTourStop,
} from "@/src/place-wishlists/application/order-wishlist-city-tour"

const STAY_STORAGE_PREFIX = "fiktionmaps.wishlist-stay."

export type WishlistStay = {
  label: string
  lat: number
  lng: number
}

export type WishlistExplorerItem = {
  placeId: string
  placeName: string
  placeImage: string | null
  fictionTitle: string
  address: string | null
  href: string
  lat: number | null
  lng: number | null
}

export type WishlistTourItem = WishlistTourStop<WishlistExplorerItem>

function stayStorageKey(cityKey: string) {
  return `${STAY_STORAGE_PREFIX}${cityKey}`
}

function readStay(cityKey: string): WishlistStay | null {
  try {
    const raw = window.localStorage.getItem(stayStorageKey(cityKey))
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<WishlistStay>
    if (
      typeof parsed.label === "string" &&
      Number.isFinite(parsed.lat) &&
      Number.isFinite(parsed.lng)
    ) {
      return { label: parsed.label, lat: parsed.lat as number, lng: parsed.lng as number }
    }
    return null
  } catch {
    return null
  }
}

function writeStay(cityKey: string, stay: WishlistStay | null) {
  try {
    if (!stay) window.localStorage.removeItem(stayStorageKey(cityKey))
    else window.localStorage.setItem(stayStorageKey(cityKey), JSON.stringify(stay))
  } catch {
    // quota / private mode
  }
}

const WishlistCitySelectionContext = createContext<{
  selectedId: string | null
  setSelectedId: (id: string | null) => void
  stay: WishlistStay | null
  setStay: (stay: WishlistStay | null) => void
  tour: WishlistTourItem[]
  cityKey: string
  stayProximity: { lat: number; lng: number } | null
  pickingStay: boolean
  setPickingStay: (picking: boolean) => void
} | null>(null)

export function WishlistCitySelectionProvider({
  cityKey,
  items,
  children,
}: {
  cityKey: string
  items: WishlistExplorerItem[]
  children: ReactNode
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [stay, setStayState] = useState<WishlistStay | null>(null)
  const [pickingStay, setPickingStay] = useState(false)

  useEffect(() => {
    setStayState(readStay(cityKey))
  }, [cityKey])

  const setStay = useCallback(
    (next: WishlistStay | null) => {
      setStayState(next)
      writeStay(cityKey, next)
      setPickingStay(false)
    },
    [cityKey],
  )

  const tour = useMemo(() => planWishlistCityTour(items ?? [], stay), [items, stay])

  const proximity = useMemo(() => {
    if (stay) return { lat: stay.lat, lng: stay.lng }
    const first = items.find((item) => item.lat != null && item.lng != null)
    if (first?.lat == null || first.lng == null) return null
    return { lat: first.lat, lng: first.lng }
  }, [items, stay])

  const value = useMemo(
    () => ({
      selectedId,
      setSelectedId,
      stay,
      setStay,
      tour,
      cityKey,
      stayProximity: proximity,
      pickingStay,
      setPickingStay,
    }),
    [selectedId, stay, setStay, tour, cityKey, proximity, pickingStay],
  )

  return (
    <WishlistCitySelectionContext.Provider value={value}>
      {children}
    </WishlistCitySelectionContext.Provider>
  )
}

export function useWishlistCitySelection() {
  const ctx = useContext(WishlistCitySelectionContext)
  if (!ctx) {
    throw new Error("useWishlistCitySelection must be used within WishlistCitySelectionProvider")
  }
  return ctx
}
