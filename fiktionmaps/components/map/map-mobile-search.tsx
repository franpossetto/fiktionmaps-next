"use client"

import { useState } from "react"
import { Search } from "lucide-react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { MapFictionCitySearch } from "@/components/map/map-fiction-city-search"
import type { MapFictionChipPreview } from "@/components/map/map-fiction-city-search"
import type { City } from "@/src/cities/domain/city.entity"
import type { FictionWithMedia } from "@/src/fictions/domain/fiction.entity"
import type { Place } from "@/src/places/domain/place.entity"
import type { MapFictionCitySearchEntry } from "@/src/places/domain/map-fiction-city-pair.entity"

type MapMobileSearchProps = {
  selectedCity: City
  browseMode?: import("@/lib/map/world-map").MapBrowseMode
  availableFictions: FictionWithMedia[]
  selectedFictionIds: string[]
  fictionChipPreviews?: MapFictionChipPreview[] | null
  cityPlaces: Place[]
  onSelectPair: (entry: MapFictionCitySearchEntry) => void
  onSelectCity: (cityId: string) => void
  onSelectPlace: (place: Place) => void
  onRemoveFiction: (fictionId: string) => void
  onRequestPickFiction: () => void
}

/** Mobile-only entry to the same map search (desktop bar stays in the header). */
export function MapMobileSearch(props: MapMobileSearchProps) {
  const t = useTranslations("Map")
  const [open, setOpen] = useState(false)

  const closeThen =
    <A,>(fn: (arg: A) => void) =>
    (arg: A) => {
      fn(arg)
      setOpen(false)
    }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="pointer-events-auto h-10 w-10 shrink-0 border-chrome-border bg-chrome/90 text-foreground backdrop-blur-md hover:bg-chrome-hover md:hidden"
        aria-label={t("openMapSearch")}
        onClick={() => setOpen(true)}
      >
        <Search className="h-4 w-4" />
      </Button>
      <DialogContent className="left-0 top-0 z-[10050] flex h-[100dvh] w-full max-w-none translate-x-0 translate-y-0 flex-col gap-3 rounded-none border-0 p-4 sm:max-w-none">
        <DialogHeader className="shrink-0 text-left">
          <DialogTitle>{t("mapSearchDialogTitle")}</DialogTitle>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-visible">
          <MapFictionCitySearch
            {...props}
            onSelectPair={closeThen(props.onSelectPair)}
            onSelectCity={closeThen(props.onSelectCity)}
            onSelectPlace={closeThen(props.onSelectPlace)}
            onRequestPickFiction={() => {
              setOpen(false)
              props.onRequestPickFiction()
            }}
            className="w-full"
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
