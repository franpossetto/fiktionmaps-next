"use client"

import { useRef, useState, useEffect } from "react"
import { ChevronLeft, ChevronRight, Images, X } from "lucide-react"
import type { Location } from "@/lib/modules/locations"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { useIsMobile } from "@/hooks/use-mobile"
import { usePlaceSelectorCollapsedStorage } from "@/lib/local-storage-service-hooks"

/** Match nav map small height (SIZE_SMALL.height in nav-map.tsx) */
const CAROUSEL_HEIGHT = 140
const THUMB_SIZE = CAROUSEL_HEIGHT - 16 // minus py-2
const THUMB_SIZE_PX = `${THUMB_SIZE}px`

interface ThumbnailCarouselProps {
  locations: Location[]
  selectedLocationId?: string | null
  onLocationClick: (location: Location) => void
}

export function ThumbnailCarousel({
  locations,
  selectedLocationId,
  onLocationClick,
}: ThumbnailCarouselProps) {
  const isMobile = useIsMobile()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [placeSelectorCollapsed, setPlaceSelectorCollapsed] = usePlaceSelectorCollapsedStorage()
  const isVisible = isMobile ? false : !placeSelectorCollapsed

  const selectedIndex =
    selectedLocationId != null
      ? locations.findIndex((loc) => loc.id === selectedLocationId)
      : -1
  const selectedLocation = selectedIndex >= 0 ? locations[selectedIndex] : null

  const goToPrevPlace = () => {
    if (locations.length === 0) return
    if (selectedIndex > 0) {
      onLocationClick(locations[selectedIndex - 1])
    } else {
      onLocationClick(locations[locations.length - 1])
    }
  }

  const goToNextPlace = () => {
    if (locations.length === 0) return
    if (selectedIndex >= 0 && selectedIndex < locations.length - 1) {
      onLocationClick(locations[selectedIndex + 1])
    } else {
      onLocationClick(locations[0])
    }
  }

  useEffect(() => {
    if (selectedIndex < 0 || !scrollRef.current || !locations[selectedIndex]) return
    const id = locations[selectedIndex].id
    const thumb = scrollRef.current.querySelector(`[data-location-id="${id}"]`)
    if (thumb) {
      thumb.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" })
    }
  }, [selectedIndex, locations])

  if (locations.length === 0) return null

  if (!isVisible) {
    return (
      <div className="absolute bottom-4 left-1/2 z-[1000] flex -translate-x-1/2 items-end pointer-events-none md:left-4 md:translate-x-0">
        <button
          type="button"
          onClick={() => setPlaceSelectorCollapsed(false)}
          className="pointer-events-auto flex items-center gap-2 rounded-lg border border-border bg-chrome/95 px-3 py-2 text-xs font-medium text-foreground shadow-[0_2px_8px_rgba(0,0,0,0.2)] backdrop-blur-sm transition-colors hover:bg-chrome"
          aria-label="Show places"
        >
          <Images className="h-4 w-4" />
          Show places
        </button>
      </div>
    )
  }

  return (
    <div className="absolute bottom-4 left-1/2 z-[1000] flex -translate-x-1/2 flex-col items-start gap-1 pointer-events-none md:left-4 md:translate-x-0">
      <button
        type="button"
        onClick={() => setPlaceSelectorCollapsed(true)}
        className="pointer-events-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-chrome/95 text-foreground shadow-[0_2px_8px_rgba(0,0,0,0.2)] backdrop-blur-sm transition-colors hover:bg-chrome"
        aria-label="Hide places"
      >
        <X className="h-4 w-4" />
      </button>
      {/* Camera film strip — same height as nav map (CAROUSEL_HEIGHT) */}
      <div
        className="pointer-events-auto flex flex-col rounded-lg overflow-hidden border border-border bg-card shadow-lg"
        style={{ height: CAROUSEL_HEIGHT, width: "min(700px, calc(100vw - 2rem))" }}
      >
        {/* Film frame strip: nav + thumbnails */}
        <div className="flex h-full items-center gap-1.5 px-2 py-2 bg-muted/50">
          <button
            onClick={goToPrevPlace}
            className="flex w-8 shrink-0 items-center justify-center rounded border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            style={{ height: THUMB_SIZE }}
            aria-label="Previous place"
          >
            <ChevronLeft className="h-3 w-3" />
          </button>

          <div
            ref={scrollRef}
            className="flex flex-1 min-w-0 gap-1.5 overflow-x-auto scroll-smooth no-scrollbar py-0.5"
          >
            {locations.map((loc) => {
              const isSelected = selectedLocationId === loc.id
              const isHovered = hoveredId === loc.id
              return (
                <button
                  key={loc.id}
                  data-location-id={loc.id}
                  onClick={() => onLocationClick(loc)}
                  onMouseEnter={() => setHoveredId(loc.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  className={cn(
                    "relative shrink-0 overflow-hidden rounded-sm border-2 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    "inline-flex items-center justify-center",
                    "bg-muted border-border",
                    isSelected
                      ? "border-primary ring-2 ring-primary/30 ring-offset-2 ring-offset-background"
                      : isHovered
                        ? "border-border bg-muted"
                        : "opacity-90 hover:opacity-100 hover:border-border hover:bg-muted",
                  )}
                  style={{ width: THUMB_SIZE_PX, height: THUMB_SIZE_PX }}
                  aria-label={loc.name}
                  aria-current={isSelected ? "true" : undefined}
                >
                  <Image
                    src={loc.image}
                    alt=""
                    fill
                    className="object-cover"
                    sizes={`${THUMB_SIZE}px`}
                  />
                </button>
              )
            })}
          </div>

          <button
            onClick={goToNextPlace}
            className="flex w-8 shrink-0 items-center justify-center rounded border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            style={{ height: THUMB_SIZE }}
            aria-label="Next place"
          >
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  )
}
