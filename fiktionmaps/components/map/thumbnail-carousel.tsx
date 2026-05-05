"use client"

import { useRef, useState, useEffect, useCallback } from "react"
import { ChevronLeft, ChevronRight, Images, X } from "lucide-react"
import { useTranslations } from "next-intl"
import type { Place } from "@/src/places/domain/place.entity"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { useIsMobile } from "@/hooks/use-mobile"
import { usePlaceSelectorCollapsedStorage } from "@/lib/local-storage-service-hooks"

const CAROUSEL_HEIGHT = 140
const THUMB_SIZE = CAROUSEL_HEIGHT - 16 // minus py-2
const THUMB_SIZE_PX = `${THUMB_SIZE}px`

interface ThumbnailCarouselProps {
  places: Place[]
  selectedLocationId?: string | null
  onLocationClick: (location: Place) => void
  placeSelectorCollapsed?: boolean
  setPlaceSelectorCollapsed?: (collapsed: boolean) => void
}

export function ThumbnailCarousel({
  places,
  selectedLocationId,
  onLocationClick,
  placeSelectorCollapsed: controlledCollapsed,
  setPlaceSelectorCollapsed: setControlledCollapsed,
}: ThumbnailCarouselProps) {
  const t = useTranslations("Map")
  const isMobile = useIsMobile()
  const scrollRef = useRef<HTMLDivElement>(null)
  const expandButtonRef = useRef<HTMLButtonElement>(null)
  const thumbRefs = useRef<(HTMLButtonElement | null)[]>([])
  const prevCollapsedRef = useRef<boolean | null>(null)

  const [internalCollapsed, setInternalCollapsed] = usePlaceSelectorCollapsedStorage()
  const placeSelectorCollapsed = controlledCollapsed ?? internalCollapsed
  const setPlaceSelectorCollapsed = setControlledCollapsed ?? setInternalCollapsed

  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const isVisible = isMobile ? false : !placeSelectorCollapsed

  const selectedIndex =
    selectedLocationId != null
      ? places.findIndex((loc) => loc.id === selectedLocationId)
      : -1
  const effectiveIndex = selectedIndex >= 0 ? selectedIndex : 0
  const selectedLocation = selectedIndex >= 0 ? places[selectedIndex] : null

  const goToPrevPlace = useCallback(() => {
    if (places.length === 0) return
    const nextIndex = selectedIndex > 0 ? selectedIndex - 1 : places.length - 1
    onLocationClick(places[nextIndex])
    thumbRefs.current[nextIndex]?.focus()
  }, [places, selectedIndex, onLocationClick])

  const goToNextPlace = useCallback(() => {
    if (places.length === 0) return
    const nextIndex =
      selectedIndex >= 0 && selectedIndex < places.length - 1 ? selectedIndex + 1 : 0
    onLocationClick(places[nextIndex])
    thumbRefs.current[nextIndex]?.focus()
  }, [places, selectedIndex, onLocationClick])

  useEffect(() => {
    if (effectiveIndex < 0 || !scrollRef.current || !places[effectiveIndex]) return
    const id = places[effectiveIndex].id
    const thumb = scrollRef.current.querySelector(`[data-place-id="${id}"]`)
    if (thumb) {
      thumb.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" })
    }
  }, [effectiveIndex, places])

  useEffect(() => {
    const wasExpanded = prevCollapsedRef.current === false
    const isNowCollapsed = placeSelectorCollapsed === true
    prevCollapsedRef.current = placeSelectorCollapsed
    if (wasExpanded && isNowCollapsed) {
      expandButtonRef.current?.focus()
    }
  }, [placeSelectorCollapsed])

  useEffect(() => {
    if (!isVisible || places.length === 0) return
    const loc = places[effectiveIndex]
    if (loc) onLocationClick(loc)
    const toFocus = thumbRefs.current[effectiveIndex] ?? thumbRefs.current[0]
    toFocus?.focus()
  }, [isVisible]) // eslint-disable-line react-hooks/exhaustive-deps -- only on open

  const handleStripKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault()
      goToPrevPlace()
    } else if (e.key === "ArrowRight") {
      e.preventDefault()
      goToNextPlace()
    }
  }

  const handleClose = () => {
    setPlaceSelectorCollapsed(true)
  }

  if (places.length === 0) return null

  if (!isVisible) {
    return (
      <div className="absolute bottom-4 left-1/2 z-[1000] flex -translate-x-1/2 items-end pointer-events-none md:left-4 md:translate-x-0">
        <button
          ref={expandButtonRef}
          type="button"
          onClick={() => setPlaceSelectorCollapsed(false)}
          className="pointer-events-auto flex items-center gap-2 rounded-lg border border-border bg-chrome/95 px-3 py-2 text-xs font-medium text-foreground shadow-[0_2px_8px_rgba(0,0,0,0.2)] backdrop-blur-sm transition-colors hover:bg-chrome"
          aria-label={t("navigationMode")}
        >
          <Images className="h-4 w-4" />
          {t("navigationMode")}
        </button>
      </div>
    )
  }

  return (
    <div className="absolute bottom-4 left-1/2 z-[1000] flex -translate-x-1/2 flex-col items-start gap-1 pointer-events-none md:left-4 md:translate-x-0">
      <button
        type="button"
        onClick={handleClose}
        className="pointer-events-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-chrome/95 text-foreground shadow-[0_2px_8px_rgba(0,0,0,0.2)] backdrop-blur-sm transition-colors hover:bg-chrome"
        aria-label={t("exitNavigationMode")}
      >
        <X className="h-4 w-4" />
      </button>
      <div
        className="pointer-events-auto flex flex-col rounded-lg overflow-hidden border border-border bg-card shadow-lg"
        style={{ height: CAROUSEL_HEIGHT, width: "min(700px, calc(100vw - 2rem))" }}
      >
        <div
          className="flex h-full items-center gap-1.5 px-2 py-2 bg-muted/50"
          onKeyDown={handleStripKeyDown}
          role="group"
          aria-label={t("navigationMode")}
        >
          <button
            onClick={goToPrevPlace}
            className="flex w-8 shrink-0 items-center justify-center rounded border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            style={{ height: THUMB_SIZE }}
            aria-label={t("previousPlace")}
          >
            <ChevronLeft className="h-3 w-3" />
          </button>

          <div
            ref={scrollRef}
            className="flex flex-1 min-w-0 gap-1.5 overflow-x-auto scroll-smooth no-scrollbar py-0.5"
            role="listbox"
            aria-activedescendant={places[effectiveIndex]?.id}
          >
            {places.map((loc, index) => {
              const isSelected = selectedLocationId === loc.id
              const isHovered = hoveredId === loc.id
              const tabIndex = effectiveIndex === index ? 0 : -1
              return (
                <button
                  key={loc.id}
                  ref={(el) => {
                    thumbRefs.current[index] = el
                  }}
                  data-place-id={loc.id}
                  role="option"
                  tabIndex={tabIndex}
                  id={loc.id}
                  aria-selected={isSelected}
                  aria-label={t("placeOfTotal", {
                    name: loc.sceneTitle ?? loc.name ?? loc.location.name,
                    current: index + 1,
                    total: places.length,
                  })}
                  onClick={() => onLocationClick(loc)}
                  onMouseEnter={() => setHoveredId(loc.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onKeyDown={handleStripKeyDown}
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
            aria-label={t("nextPlace")}
          >
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  )
}
