"use client"

import { useEffect, useRef, useState } from "react"
import { Check, Loader2, MapPin, Pencil, RotateCcw, SlidersHorizontal } from "lucide-react"
import { useTranslations } from "next-intl"
import { MapProvider, MapContainer, MapMarker } from "@/lib/map"
import type { LatLng } from "@/lib/map/types"
import { isGoogleMapsConfigured, loadGoogleMaps } from "@/lib/google-maps/load-google-maps"
import { applyKnownPano, positionOutdoorPanoramaAtPlace } from "@/lib/google-maps/street-view-at-place"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { HuntPlaceSectionHeading } from "./hunt-place-section-heading"

type PreviewState = "idle" | "loading" | "ready" | "no_coverage" | "error" | "missing_key"

const MAP_FRAME_CLASS =
  "relative min-h-[280px] h-[min(58vw,420px)] w-full overflow-hidden rounded-xl border border-border/60 bg-muted/20 sm:min-h-[320px] sm:h-[400px]"

function googleMapsHref(lat: number, lng: number, addressQuery: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    addressQuery.trim() || `${lat},${lng}`,
  )}`
}

export interface HuntPlaceVerificationPanelProps {
  mapId: string
  latitude: number
  longitude: number
  placeName: string
  description?: string
  formattedAddress: string
  coordsAdjusted?: boolean
  savedPanoId?: string | null
  onCoordsChange: (coords: LatLng) => void
  onCoordsReset?: () => void
  onPanoResolved?: (panoId: string) => void
  className?: string
}

export function HuntPlaceVerificationPanel({
  mapId,
  latitude,
  longitude,
  placeName,
  description,
  formattedAddress,
  coordsAdjusted = false,
  savedPanoId,
  onCoordsChange,
  onCoordsReset,
  onPanoResolved,
  className,
}: HuntPlaceVerificationPanelProps) {
  const t = useTranslations("Contribute.huntReview")
  const tFictions = useTranslations("Fictions")
  const containerRef = useRef<HTMLDivElement>(null)
  const panoramaRef = useRef<HTMLDivElement>(null)
  const panoramaInstanceRef = useRef<google.maps.StreetViewPanorama | null>(null)
  const [visible, setVisible] = useState(false)
  const [mapReady, setMapReady] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [pendingCoords, setPendingCoords] = useState<LatLng | null>(null)
  const [fixOpen, setFixOpen] = useState(false)
  const [fixLat, setFixLat] = useState("")
  const [fixLng, setFixLng] = useState("")
  const [fixError, setFixError] = useState(false)
  const [state, setState] = useState<PreviewState>(() =>
    isGoogleMapsConfigured() ? "idle" : "missing_key",
  )

  const savedPanoIdRef = useRef(savedPanoId)
  const onPanoResolvedRef = useRef(onPanoResolved)
  useEffect(() => {
    savedPanoIdRef.current = savedPanoId
    onPanoResolvedRef.current = onPanoResolved
  })

  const center = { lat: latitude, lng: longitude }
  const displayCenter = editMode && pendingCoords ? pendingCoords : center
  const mapsHref = googleMapsHref(latitude, longitude, formattedAddress)
  const addressLinkClass =
    "font-medium text-foreground underline underline-offset-4 transition-colors hover:text-primary"

  useEffect(() => {
    const el = containerRef.current
    if (!el || state === "missing_key") return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: "120px" },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [state])

  // Stop the panorama from loading tiles when the component unmounts.
  useEffect(() => {
    return () => {
      if (panoramaInstanceRef.current) {
        panoramaInstanceRef.current.setVisible(false)
        panoramaInstanceRef.current = null
      }
    }
  }, [])

  // Creates the panorama once when visible, then repositions it whenever coordinates change.
  useEffect(() => {
    if (!visible || !isGoogleMapsConfigured()) return

    let cancelled = false
    setState("loading")

    void (async () => {
      try {
        const googleMaps = await loadGoogleMaps()
        if (cancelled || !panoramaRef.current) return

        let panorama = panoramaInstanceRef.current
        if (!panorama) {
          // visible: false prevents the API from auto-initializing with a random
          // or geolocated panorama before we set the correct outdoor position.
          panorama = new googleMaps.maps.StreetViewPanorama(panoramaRef.current, {
            visible: false,
            disableDefaultUI: true,
            clickToGo: false,
            scrollwheel: false,
            addressControl: false,
            linksControl: false,
            panControl: false,
            zoomControl: false,
            fullscreenControl: false,
            motionTracking: false,
            motionTrackingControl: false,
            enableCloseButton: false,
          })
          panoramaInstanceRef.current = panorama
        }

        // Fast path: reuse the previously-resolved pano instead of hitting the service.
        const savedPanoId = savedPanoIdRef.current
        if (savedPanoId) {
          applyKnownPano(panorama, savedPanoId, latitude, longitude)
          if (cancelled) return
          panorama.setVisible(true)
          setState("ready")
          return
        }

        const panoId = await positionOutdoorPanoramaAtPlace(
          googleMaps,
          panorama,
          latitude,
          longitude,
        )

        if (cancelled) return

        if (panoId) {
          panorama.setVisible(true)
          setState("ready")
          onPanoResolvedRef.current?.(panoId)
        } else {
          setState("no_coverage")
        }
      } catch {
        if (!cancelled) setState("error")
      }
    })()

    return () => {
      cancelled = true
    }
  }, [visible, latitude, longitude])

  const statusMessage =
    state === "missing_key"
      ? "Google Maps API key not configured"
      : state === "no_coverage"
        ? "No outdoor Street View near this point — try moving the pin on the map"
        : state === "error"
          ? "Could not load Street View"
          : null

  return (
    <div ref={containerRef} className={cn("space-y-6", className)}>
      <div className="space-y-5" aria-label={`Street View for ${placeName}`}>
        <div
          className="relative aspect-[21/9] w-full overflow-hidden rounded-xl border border-border/60 bg-muted/30"
          aria-label={`Street View preview for ${placeName}`}
        >
          <div ref={panoramaRef} className="absolute inset-0" />
          {state === "idle" || state === "loading" ? (
            <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-[1px]">
              <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" aria-hidden />
            </div>
          ) : null}
          {statusMessage ? (
            <div className="absolute inset-0 flex items-center justify-center bg-muted/80 px-4 text-center text-sm text-muted-foreground">
              {statusMessage}
            </div>
          ) : null}
        </div>
        {description ? (
          <p className="max-w-[75ch] text-base leading-8 text-muted-foreground">{description}</p>
        ) : null}
      </div>

      <section
        className="space-y-4 border-b border-border/60 pb-10"
        aria-labelledby="hunt-directions-heading"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <HuntPlaceSectionHeading id="hunt-directions-heading" title={t("mapHeading")} />
          <div className="flex flex-wrap items-center gap-2">
            {!editMode ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => { setPendingCoords(null); setEditMode(true) }}
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden />
                  Edit pin
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => { setFixLat(""); setFixLng(""); setFixError(false); setFixOpen(true) }}
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
                  {t("fixCoords")}
                </Button>
                {coordsAdjusted && onCoordsReset ? (
                  <Button type="button" variant="outline" size="sm" onClick={onCoordsReset}>
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                    {t("resetPin")}
                  </Button>
                ) : null}
              </>
            ) : (
              <>
                <Button
                  type="button"
                  size="sm"
                  disabled={!pendingCoords}
                  onClick={() => { if (pendingCoords) onCoordsChange(pendingCoords); setEditMode(false); setPendingCoords(null) }}
                >
                  <Check className="h-3.5 w-3.5" aria-hidden />
                  Accept
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => { setPendingCoords(null); setEditMode(false) }}
                >
                  Cancel
                </Button>
              </>
            )}
          </div>
        </div>
        <div className={MAP_FRAME_CLASS}>
          {visible ? (
            <MapProvider libraries={[]}>
              <MapContainer
                id={mapId}
                mapKey={mapId}
                defaultCenter={center}
                center={displayCenter}
                defaultZoom={17}
                minZoom={14}
                maxZoom={19}
                interactive={editMode}
                showLoadingOverlay={false}
                controls={{ fullscreen: false }}
                className="h-full w-full"
                onClick={editMode ? setPendingCoords : undefined}
                onMapReady={() => setMapReady(true)}
              >
                {mapReady ? (
                  <MapMarker position={displayCenter} anchor="bottom">
                    <div className="pointer-events-none flex flex-col items-center">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-primary bg-background shadow-md">
                        <MapPin className="h-4 w-4 text-primary" aria-hidden />
                      </div>
                      <div className="h-0 w-0 border-l-[5px] border-r-[5px] border-t-[6px] border-l-transparent border-r-transparent border-t-primary" />
                    </div>
                  </MapMarker>
                ) : null}
              </MapContainer>
            </MapProvider>
          ) : (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden />
            </div>
          )}
        </div>

        {formattedAddress ? (
          <p className="text-sm leading-relaxed sm:text-base">
            <a href={mapsHref} target="_blank" rel="noopener noreferrer" className={addressLinkClass}>
              {formattedAddress}
            </a>
          </p>
        ) : (
          <p className="text-sm leading-relaxed sm:text-base">
            <a href={mapsHref} target="_blank" rel="noopener noreferrer" className={addressLinkClass}>
              {tFictions("placeDetailOpenInGoogleMaps")}
            </a>
          </p>
        )}

        {editMode ? (
          <p className="text-xs text-muted-foreground">{t("mapHint")}</p>
        ) : null}
      </section>

      <Dialog open={fixOpen} onOpenChange={setFixOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("fixCoordsModalTitle")}</DialogTitle>
            <DialogDescription>{t("fixCoordsModalDescription")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="fix-lat">{t("fixCoordsLatLabel")}</Label>
              <Input
                id="fix-lat"
                type="text"
                inputMode="decimal"
                placeholder={t("fixCoordsLatPlaceholder")}
                value={fixLat}
                onChange={(e) => { setFixLat(e.target.value); setFixError(false) }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fix-lng">{t("fixCoordsLngLabel")}</Label>
              <Input
                id="fix-lng"
                type="text"
                inputMode="decimal"
                placeholder={t("fixCoordsLngPlaceholder")}
                value={fixLng}
                onChange={(e) => { setFixLng(e.target.value); setFixError(false) }}
              />
            </div>
            {fixError && (
              <p className="text-xs text-destructive">{t("fixCoordsInvalid")}</p>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" size="sm">
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                const lat = parseFloat(fixLat.replace(",", "."))
                const lng = parseFloat(fixLng.replace(",", "."))
                if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
                  setFixError(true)
                  return
                }
                onCoordsChange({ lat, lng })
                setFixOpen(false)
              }}
            >
              {t("fixCoordsApply")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
