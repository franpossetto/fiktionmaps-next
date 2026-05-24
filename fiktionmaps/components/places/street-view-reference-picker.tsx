"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useTranslations } from "next-intl"
import { Check, Loader2 } from "lucide-react"
import type { StreetViewReference } from "@/src/locations/domain/location-view-reference.schemas"
import { isGoogleMapsConfigured, loadGoogleMaps } from "@/lib/google-maps/load-google-maps"
import {
  STREET_VIEW_FOV_DEFAULT,
  STREET_VIEW_FOV_MAX,
  STREET_VIEW_FOV_MIN,
  streetViewFovToZoom,
  streetViewZoomToFov,
} from "@/lib/google-maps/street-view-zoom-fov"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"

export interface StreetViewReferencePickerProps {
  placeLatitude: number
  placeLongitude: number
  value: StreetViewReference | null
  onChange: (ref: StreetViewReference | null) => void
  className?: string
}

type LoadState = "loading" | "ready" | "no_coverage" | "error" | "missing_key"

const STREET_VIEW_SEARCH_RADIUS_M = 150

function isValidCoordinate(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng)
}

/** Initial camera heading from panorama position toward the place coordinates. */
function bearingTowardPlace(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
): number {
  const φ1 = (fromLat * Math.PI) / 180
  const φ2 = (toLat * Math.PI) / 180
  const Δλ = ((toLng - fromLng) * Math.PI) / 180
  const y = Math.sin(Δλ) * Math.cos(φ2)
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ)
  const deg = (Math.atan2(y, x) * 180) / Math.PI
  return (deg + 360) % 360
}

function positionPanoramaAtPlace(
  googleMaps: typeof google,
  panorama: google.maps.StreetViewPanorama,
  placeLatitude: number,
  placeLongitude: number,
): Promise<boolean> {
  const service = new googleMaps.maps.StreetViewService()
  const target = { lat: placeLatitude, lng: placeLongitude }

  const tryGetPanorama = (
    source: google.maps.StreetViewSource,
    radius: number,
  ): Promise<google.maps.StreetViewPanoramaData | null> =>
    new Promise((resolve) => {
      service.getPanorama({ location: target, radius, source }, (data, status) => {
        resolve(
          status === googleMaps.maps.StreetViewStatus.OK && data?.location?.latLng ? data : null,
        )
      })
    })

  return (async () => {
    let data =
      (await tryGetPanorama(googleMaps.maps.StreetViewSource.OUTDOOR, 75)) ??
      (await tryGetPanorama(googleMaps.maps.StreetViewSource.DEFAULT, STREET_VIEW_SEARCH_RADIUS_M))

    if (!data?.location?.latLng) return false

    if (data.location.pano) {
      panorama.setPano(data.location.pano)
    }
    panorama.setPosition(target)

    const panoLat = data.location.latLng.lat()
    const panoLng = data.location.latLng.lng()
    const heading = bearingTowardPlace(panoLat, panoLng, placeLatitude, placeLongitude)

    panorama.setPov({ heading, pitch: 0 })
    panorama.setZoom(streetViewFovToZoom(STREET_VIEW_FOV_DEFAULT))
    return true
  })()
}

function buildReferenceFromPanorama(panorama: google.maps.StreetViewPanorama): StreetViewReference | null {
  const position = panorama.getPosition()
  if (!position) return null
  const pov = panorama.getPov()
  const zoom = panorama.getZoom() ?? streetViewFovToZoom(STREET_VIEW_FOV_DEFAULT)
  const panoId = panorama.getPano()?.trim() || null
  return {
    latitude: position.lat(),
    longitude: position.lng(),
    heading: pov?.heading ?? 0,
    pitch: pov?.pitch ?? 0,
    fov: streetViewZoomToFov(zoom),
    panoId,
  }
}

export function StreetViewReferencePicker({
  placeLatitude,
  placeLongitude,
  value,
  onChange,
  className,
}: StreetViewReferencePickerProps) {
  const t = useTranslations("Contribute.place")
  const panoramaRef = useRef<HTMLDivElement>(null)
  const panoramaInstanceRef = useRef<google.maps.StreetViewPanorama | null>(null)
  const syncingFromPanoramaRef = useRef(false)

  const [loadState, setLoadState] = useState<LoadState>(() =>
    isGoogleMapsConfigured() ? "loading" : "missing_key",
  )
  const [heading, setHeading] = useState(value?.heading ?? 0)
  const [pitch, setPitch] = useState(value?.pitch ?? 0)
  const [fov, setFov] = useState(value?.fov ?? STREET_VIEW_FOV_DEFAULT)

  const syncControlsFromPanorama = useCallback((panorama: google.maps.StreetViewPanorama) => {
    syncingFromPanoramaRef.current = true
    const pov = panorama.getPov()
    const zoom = panorama.getZoom() ?? streetViewFovToZoom(STREET_VIEW_FOV_DEFAULT)
    setHeading(pov?.heading ?? 0)
    setPitch(pov?.pitch ?? 0)
    setFov(streetViewZoomToFov(zoom))
    queueMicrotask(() => {
      syncingFromPanoramaRef.current = false
    })
  }, [])

  useEffect(() => {
    if (!isGoogleMapsConfigured() || !panoramaRef.current) return
    if (!isValidCoordinate(placeLatitude, placeLongitude)) {
      setLoadState("error")
      return
    }

    let cancelled = false
    const listeners: google.maps.MapsEventListener[] = []

    void (async () => {
      try {
        const googleMaps = await loadGoogleMaps()
        if (cancelled || !panoramaRef.current) return

        const panorama = new googleMaps.maps.StreetViewPanorama(panoramaRef.current, {
          disableDefaultUI: true,
          clickToGo: true,
          scrollwheel: true,
          addressControl: false,
          linksControl: true,
          panControl: false,
          zoomControl: false,
          fullscreenControl: false,
          motionTracking: false,
          motionTrackingControl: false,
        })
        panoramaInstanceRef.current = panorama

        const applyReference = (ref: StreetViewReference) => {
          if (ref.panoId) panorama.setPano(ref.panoId)
          panorama.setPosition({ lat: ref.latitude, lng: ref.longitude })
          panorama.setPov({ heading: ref.heading, pitch: ref.pitch })
          panorama.setZoom(streetViewFovToZoom(ref.fov))
          syncControlsFromPanorama(panorama)
        }

        if (value) {
          applyReference(value)
          setLoadState("ready")
        } else {
          const positioned = await positionPanoramaAtPlace(
            googleMaps,
            panorama,
            placeLatitude,
            placeLongitude,
          )
          if (cancelled) return
          if (positioned) {
            syncControlsFromPanorama(panorama)
            setLoadState("ready")
          } else {
            setLoadState("no_coverage")
          }
        }

        listeners.push(
          panorama.addListener("pov_changed", () => syncControlsFromPanorama(panorama)),
          panorama.addListener("zoom_changed", () => syncControlsFromPanorama(panorama)),
        )
      } catch {
        if (!cancelled) setLoadState("error")
      }
    })()

    return () => {
      cancelled = true
      for (const listener of listeners) listener.remove()
      panoramaInstanceRef.current = null
    }
  }, [placeLatitude, placeLongitude, syncControlsFromPanorama, value])

  useEffect(() => {
    const panorama = panoramaInstanceRef.current
    if (!panorama || syncingFromPanoramaRef.current || loadState !== "ready") return
    panorama.setPov({ heading, pitch })
    panorama.setZoom(streetViewFovToZoom(fov))
  }, [heading, pitch, fov, loadState])

  const handleSave = () => {
    const panorama = panoramaInstanceRef.current
    if (!panorama) return
    const ref = buildReferenceFromPanorama(panorama)
    if (ref) onChange(ref)
  }

  const handleSkip = () => onChange(null)

  const handleClear = () => {
    onChange(null)
    const panorama = panoramaInstanceRef.current
    if (!panorama || !isValidCoordinate(placeLatitude, placeLongitude)) return
    void loadGoogleMaps().then((googleMaps) =>
      positionPanoramaAtPlace(googleMaps, panorama, placeLatitude, placeLongitude).then((ok) => {
        if (ok) syncControlsFromPanorama(panorama)
      }),
    )
  }

  return (
    <div className={cn("w-full space-y-4", className)}>
      <section
        className="overflow-hidden rounded-xl border border-border bg-card"
        aria-label={t("streetViewPanoramaLabel")}
      >
        <div className="relative aspect-video w-full min-h-[min(42vh,320px)] bg-muted/20 sm:min-h-[360px] md:min-h-[400px]">
          <div ref={panoramaRef} className="absolute inset-0" />

          {loadState === "loading" ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-[1px]">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden />
            </div>
          ) : null}
          {loadState === "no_coverage" ? (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-background/95 px-4 text-center">
              <p className="text-sm text-muted-foreground">{t("streetViewNoCoverage")}</p>
              <Button type="button" variant="outline" size="sm" onClick={handleSkip}>
                {t("streetViewSkip")}
              </Button>
            </div>
          ) : null}
          {loadState === "missing_key" ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/95 px-4 text-center text-sm text-muted-foreground">
              {t("streetViewMissingKey")}
            </div>
          ) : null}
          {loadState === "error" ? (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-background/95 px-4 text-center">
              <p className="text-sm text-muted-foreground">{t("streetViewLoadError")}</p>
              <Button type="button" variant="outline" size="sm" onClick={handleSkip}>
                {t("streetViewSkip")}
              </Button>
            </div>
          ) : null}
        </div>

        {loadState === "ready" ? (
          <p className="border-t border-border/60 bg-muted/15 px-4 py-2.5 text-xs leading-relaxed text-muted-foreground">
            {t("streetViewCompareHint")}
          </p>
        ) : null}
      </section>

      {loadState === "ready" ? (
        <section
          className="space-y-4 rounded-xl border border-border/60 bg-muted/15 p-4"
          aria-label={t("streetViewControlsAria")}
        >
          <ControlSlider
            label={t("streetViewHeading")}
            value={heading}
            min={0}
            max={360}
            step={1}
            format={(v) => `${Math.round(v)}°`}
            onValueChange={setHeading}
          />
          <ControlSlider
            label={t("streetViewPitch")}
            value={pitch}
            min={-90}
            max={90}
            step={1}
            format={(v) => `${Math.round(v)}°`}
            onValueChange={setPitch}
          />
          <ControlSlider
            label={t("streetViewFov")}
            value={fov}
            min={STREET_VIEW_FOV_MIN}
            max={STREET_VIEW_FOV_MAX}
            step={1}
            format={(v) => `${Math.round(v)}°`}
            onValueChange={setFov}
          />

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button type="button" size="sm" onClick={handleSave}>
              {t("streetViewSave")}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={handleSkip}>
              {t("streetViewSkip")}
            </Button>
            {value ? (
              <Button type="button" variant="ghost" size="sm" onClick={handleClear}>
                {t("streetViewClear")}
              </Button>
            ) : null}
            {value ? (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <Check className="h-3.5 w-3.5" aria-hidden />
                {t("streetViewSaved")}
              </span>
            ) : null}
          </div>
        </section>
      ) : loadState === "no_coverage" || loadState === "error" || loadState === "missing_key" ? (
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={handleSkip}>
            {t("streetViewSkip")}
          </Button>
        </div>
      ) : null}
    </div>
  )
}

function ControlSlider({
  label,
  value,
  min,
  max,
  step,
  format,
  onValueChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  format: (value: number) => string
  onValueChange: (value: number) => void
}) {
  return (
    <label className="block space-y-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium text-foreground">{label}</span>
        <span className="tabular-nums text-muted-foreground">{format(value)}</span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(values) => onValueChange(values[0] ?? value)}
      />
    </label>
  )
}
