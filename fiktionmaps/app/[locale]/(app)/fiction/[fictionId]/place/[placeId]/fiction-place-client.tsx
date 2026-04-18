"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { useRouter } from "@/i18n/navigation"
import type { Location } from "@/src/locations/domain/location.entity"
import type { FictionWithMedia } from "@/src/fictions/domain/fiction.entity"
import type { City } from "@/src/cities/domain/city.entity"
import { PlacePage } from "@/components/map/place-page"
import { getAllCitiesAction } from "@/src/cities/infrastructure/next/city.actions"
import { getActiveFictionsAction } from "@/src/fictions/infrastructure/next/fiction.actions"
import { getPlaceLocationAction } from "@/src/places/infrastructure/next/place.actions"

export function FictionPlaceClient() {
  const params = useParams()
  const router = useRouter()
  const fictionId = params.fictionId as string
  const placeId = params.placeId as string

  const [loadError, setLoadError] = useState<string | null>(null)
  const [location, setLocation] = useState<Location | null>(null)
  const [fiction, setFiction] = useState<FictionWithMedia | null>(null)
  const [city, setCity] = useState<City | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoadError(null)
    setLocation(null)
    setFiction(null)
    setCity(null)

    ;(async () => {
      const loc = await getPlaceLocationAction(placeId)
      if (!loc) {
        if (!cancelled) setLoadError("not_found")
        return
      }
      if (cancelled) return
      if (loc.id !== placeId || loc.fictionId !== fictionId) {
        setLoadError("not_found")
        return
      }

      const [f, c] = await Promise.all([
        getActiveFictionsAction().then((rows) => rows.find((item) => item.id === fictionId) ?? null),
        getAllCitiesAction().then((rows) => rows.find((item) => item.id === loc.cityId) ?? null),
      ])
      if (cancelled) return
      setLocation(loc)
      setFiction(f ?? null)
      setCity(c ?? null)
    })()

    return () => {
      cancelled = true
    }
  }, [fictionId, placeId])

  if (loadError === "not_found") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
        <p className="text-sm font-medium text-foreground">Place not found</p>
        <button
          type="button"
          onClick={() => router.push("/map")}
          className="text-sm text-primary underline-offset-4 hover:underline"
        >
          Go to map
        </button>
      </div>
    )
  }

  if (!location) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    )
  }

  return (
    <PlacePage
      location={location}
      fiction={fiction}
      city={city}
      onBack={() => router.back()}
    />
  )
}
