"use client"

import { useEffect, useRef, useState } from "react"
import { Camera, Check, Loader2, MapPin, Pencil, RotateCcw, Search, SlidersHorizontal } from "lucide-react"
import { useTranslations } from "next-intl"
import { MapProvider, MapContainer, MapMarker } from "@/lib/map"
import {
  PlaceAddressSearch,
  DEFAULT_MAPBOX_SEARCH_TYPES,
  type PlaceAddressSelectResult,
} from "@/components/places/place-location-picker"
import type { LatLng } from "@/lib/map/types"
import type { StreetViewReference } from "@/src/locations/domain/location-view-reference.schemas"
import { isGoogleMapsConfigured, loadGoogleMaps } from "@/lib/google-maps/load-google-maps"
import {
  applyKnownPano,
  bearingTowardPlace,
  positionOutdoorPanoramaAtPlace,
} from "@/lib/google-maps/street-view-at-place"
import {
  STREET_VIEW_FOV_DEFAULT,
  streetViewFovToZoom,
  streetViewZoomToFov,
} from "@/lib/google-maps/street-view-zoom-fov"
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

// Always search by coordinates so the link lands on the exact pin, never on a
// geocoder's interpretation of the address text (which can differ).
function googleMapsHref(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}`
}

function coordsEqual(a: LatLng, b: LatLng): boolean {
  return Math.abs(a.lat - b.lat) < 1e-6 && Math.abs(a.lng - b.lng) < 1e-6
}

function coordsKey(lat: number, lng: number): string {
  return `${lat.toFixed(7)},${lng.toFixed(7)}`
}

function normalizeHeading(value: number): number {
  return ((value % 360) + 360) % 360
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

/** Same precedence as resolveCityId in place-location-picker.tsx, for consistency. */
function addressFieldsFromSelectResult(result: PlaceAddressSelectResult): HuntPlaceAddressFields {
  const countryContext = result.context?.find((c) => c.id.startsWith("country."))
  const cityContext = result.context?.find((c) => c.id.startsWith("place.") || c.id.startsWith("region."))
  return {
    address: result.text || result.place_name,
    city: cityContext?.text ?? "",
    country: countryContext?.text ?? "",
  }
}

/** Reads the live camera (pano position + angle) into a recreatable reference. */
function referenceFromPanorama(
  panorama: google.maps.StreetViewPanorama,
): StreetViewReference | null {
  const position = panorama.getPosition()
  if (!position) return null
  const pov = panorama.getPov()
  const zoom = panorama.getZoom() ?? streetViewFovToZoom(STREET_VIEW_FOV_DEFAULT)
  return {
    latitude: position.lat(),
    longitude: position.lng(),
    heading: normalizeHeading(pov?.heading ?? 0),
    pitch: clamp(pov?.pitch ?? 0, -90, 90),
    fov: clamp(streetViewZoomToFov(zoom), 10, 120),
    panoId: panorama.getPano()?.trim() || null,
  }
}

export interface HuntPlaceAddressFields {
  address: string
  city: string
  country: string
}

export interface HuntPlaceVerificationPanelProps {
  mapId: string
  latitude: number
  longitude: number
  placeName: string
  description?: string
  formattedAddress: string
  addressFields: HuntPlaceAddressFields
  coordsAdjusted?: boolean
  addressAdjusted?: boolean
  savedReference?: StreetViewReference | null
  onCoordsChange: (coords: LatLng, cameraReference?: StreetViewReference) => void
  onCoordsReset?: () => void
  onAddressChange: (address: HuntPlaceAddressFields) => void
  onAddressReset?: () => void
  onFullAddressChange: (data: { lat: number; lng: number; address: HuntPlaceAddressFields }) => void
  onReferenceChange?: (reference: StreetViewReference | null) => void
  className?: string
}

export function HuntPlaceVerificationPanel({
  mapId,
  latitude,
  longitude,
  placeName,
  description,
  formattedAddress,
  addressFields,
  coordsAdjusted = false,
  addressAdjusted = false,
  savedReference,
  onCoordsChange,
  onCoordsReset,
  onAddressChange,
  onAddressReset,
  onFullAddressChange,
  onReferenceChange,
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
  const [cameraEditMode, setCameraEditMode] = useState(false)
  const [pendingCoords, setPendingCoords] = useState<LatLng | null>(null)
  const [fixOpen, setFixOpen] = useState(false)
  const [fixLat, setFixLat] = useState("")
  const [fixLng, setFixLng] = useState("")
  const [fixError, setFixError] = useState(false)
  const [addressOpen, setAddressOpen] = useState(false)
  const [editAddress, setEditAddress] = useState("")
  const [editCity, setEditCity] = useState("")
  const [editCountry, setEditCountry] = useState("")
  const [searchAddressOpen, setSearchAddressOpen] = useState(false)
  const [searchAddressQuery, setSearchAddressQuery] = useState("")
  const [searchAddressResult, setSearchAddressResult] = useState<PlaceAddressSelectResult | null>(null)
  const [searchAddressError, setSearchAddressError] = useState<string | null>(null)
  const [viewFlash, setViewFlash] = useState(false)
  const [state, setState] = useState<PreviewState>(() =>
    isGoogleMapsConfigured() ? "idle" : "missing_key",
  )

  const savedReferenceRef = useRef(savedReference)
  const onReferenceChangeRef = useRef(onReferenceChange)
  const resolveGenerationRef = useRef(0)
  const resolvedCoordsKeyRef = useRef<string | null>(null)
  const previewStateRef = useRef<PreviewState>(state)
  const cameraSnapshotRef = useRef<StreetViewReference | null>(null)

  useEffect(() => {
    savedReferenceRef.current = savedReference
    onReferenceChangeRef.current = onReferenceChange
  })

  useEffect(() => {
    previewStateRef.current = state
  }, [state])

  useEffect(() => {
    panoramaInstanceRef.current?.setOptions({
      scrollwheel: cameraEditMode,
      clickToGo: false,
    })
  }, [cameraEditMode])

  // Coordinates the current pano (saved or resolved) actually corresponds to.
  // Used to invalidate the saved-pano fast path once the pin is moved elsewhere.
  const panoCoordsRef = useRef<LatLng>({ lat: latitude, lng: longitude })

  const center = { lat: latitude, lng: longitude }
  const displayCenter = editMode && pendingCoords ? pendingCoords : center
  // Coordinates the preview should actually show: the (unaccepted) pending pin
  // while editing, otherwise the committed place coordinates.
  const previewLat = displayCenter.lat
  const previewLng = displayCenter.lng
  const mapsHref = googleMapsHref(latitude, longitude)
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

  // Resolve outdoor Street View when the committed or preview pin moves.
  useEffect(() => {
    if (!visible || !isGoogleMapsConfigured()) return

    const targetKey = coordsKey(previewLat, previewLng)
    const committedKey = coordsKey(latitude, longitude)
    const isPreview = targetKey !== committedKey

    if (resolvedCoordsKeyRef.current !== targetKey) {
      resolvedCoordsKeyRef.current = null
    }

    if (
      !isPreview &&
      resolvedCoordsKeyRef.current === targetKey &&
      panoramaInstanceRef.current &&
      previewStateRef.current === "ready"
    ) {
      return
    }

    let cancelled = false
    const generation = ++resolveGenerationRef.current
    setState("loading")

    void (async () => {
      try {
        const googleMaps = await loadGoogleMaps()
        if (cancelled || generation !== resolveGenerationRef.current || !panoramaRef.current) return

        let panorama = panoramaInstanceRef.current
        if (!panorama) {
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

        const readSavedReference = () =>
          isPreview ? null : (savedReferenceRef.current ?? null)

        const readPovOverride = () => {
          const saved = readSavedReference()
          return saved
            ? { heading: saved.heading, pitch: saved.pitch, fov: saved.fov }
            : null
        }

        const savedAtResolve = readSavedReference()
        if (savedAtResolve?.panoId && !isPreview) {
          applyKnownPano(
            panorama,
            savedAtResolve.panoId,
            previewLat,
            previewLng,
            readPovOverride(),
          )
          if (cancelled || generation !== resolveGenerationRef.current) return
          panorama.setVisible(true)
          panoCoordsRef.current = { lat: previewLat, lng: previewLng }
          resolvedCoordsKeyRef.current = targetKey
          setState("ready")
          return
        }

        const resolved = await positionOutdoorPanoramaAtPlace(
          googleMaps,
          panorama,
          previewLat,
          previewLng,
          readPovOverride(),
        )

        if (cancelled || generation !== resolveGenerationRef.current) return

        const savedAfterResolve = readSavedReference()
        if (savedAfterResolve?.panoId && !isPreview) {
          applyKnownPano(
            panorama,
            savedAfterResolve.panoId,
            previewLat,
            previewLng,
            {
              heading: savedAfterResolve.heading,
              pitch: savedAfterResolve.pitch,
              fov: savedAfterResolve.fov,
            },
          )
          if (cancelled || generation !== resolveGenerationRef.current) return
          panorama.setVisible(true)
          panoCoordsRef.current = { lat: previewLat, lng: previewLng }
          resolvedCoordsKeyRef.current = targetKey
          setState("ready")
          return
        }

        if (resolved) {
          panorama.setVisible(true)
          setState("ready")
          panoCoordsRef.current = { lat: previewLat, lng: previewLng }
          resolvedCoordsKeyRef.current = targetKey
        } else {
          setState("no_coverage")
        }
      } catch {
        if (!cancelled && generation === resolveGenerationRef.current) setState("error")
      }
    })()

    return () => {
      cancelled = true
    }
  }, [visible, previewLat, previewLng, latitude, longitude])

  // Re-apply a user-saved camera without re-resolving the pano (coords unchanged).
  useEffect(() => {
    if (!visible || !savedReference?.panoId || state !== "ready") return
    if (!panoramaInstanceRef.current) return

    const committedKey = coordsKey(latitude, longitude)
    if (coordsKey(previewLat, previewLng) !== committedKey) return
    if (resolvedCoordsKeyRef.current !== committedKey) return

    applyKnownPano(
      panoramaInstanceRef.current,
      savedReference.panoId,
      latitude,
      longitude,
      {
        heading: savedReference.heading,
        pitch: savedReference.pitch,
        fov: savedReference.fov,
      },
    )
  }, [savedReference, visible, latitude, longitude, previewLat, previewLng, state])

  function restoreCameraSnapshot(snapshot: StreetViewReference) {
    const panorama = panoramaInstanceRef.current
    if (!panorama) return
    if (snapshot.panoId) {
      panorama.setPano(snapshot.panoId)
    }
    panorama.setPov({ heading: snapshot.heading, pitch: snapshot.pitch })
    panorama.setZoom(streetViewFovToZoom(snapshot.fov))
  }

  function handleEnterCameraEdit() {
    const panorama = panoramaInstanceRef.current
    if (!panorama || state !== "ready") return
    cameraSnapshotRef.current = referenceFromPanorama(panorama)
    setCameraEditMode(true)
  }

  function handleAcceptCamera() {
    const panorama = panoramaInstanceRef.current
    if (!panorama) return
    const reference = referenceFromPanorama(panorama)
    if (!reference) return
    savedReferenceRef.current = reference
    onReferenceChange?.(reference)
    setCameraEditMode(false)
    cameraSnapshotRef.current = null
    setViewFlash(true)
    window.setTimeout(() => setViewFlash(false), 1600)
  }

  function handleCancelCameraEdit() {
    const snapshot = cameraSnapshotRef.current
    if (snapshot) {
      restoreCameraSnapshot(snapshot)
    }
    setCameraEditMode(false)
    cameraSnapshotRef.current = null
  }

  function handleAcceptPin() {
    if (!pendingCoords) return

    const targetKey = coordsKey(pendingCoords.lat, pendingCoords.lng)
    const panorama = panoramaInstanceRef.current
    const cameraReference =
      panorama && previewStateRef.current === "ready"
        ? referenceFromPanorama(panorama)
        : undefined

    // Panorama already shows this pin while editing — keep it when committing.
    resolvedCoordsKeyRef.current = targetKey
    panoCoordsRef.current = { lat: pendingCoords.lat, lng: pendingCoords.lng }
    if (cameraReference) {
      savedReferenceRef.current = cameraReference
    }

    onCoordsChange(pendingCoords, cameraReference ?? undefined)
    setEditMode(false)
    setCameraEditMode(false)
    setPendingCoords(null)
  }

  function handleResetView() {
    const panorama = panoramaInstanceRef.current
    if (!panorama) {
      onReferenceChange?.(null)
      return
    }
    const heading = normalizeHeading(
      bearingTowardPlace(
        panorama.getPosition()?.lat() ?? latitude,
        panorama.getPosition()?.lng() ?? longitude,
        latitude,
        longitude,
      ),
    )
    panorama.setPov({ heading, pitch: 0 })
    panorama.setZoom(streetViewFovToZoom(STREET_VIEW_FOV_DEFAULT))
    onReferenceChange?.(null)
  }

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
        <div className="flex flex-wrap items-center justify-between gap-2">
          <HuntPlaceSectionHeading id="hunt-streetview-heading" title={t("streetViewHeading")} />
          {!editMode && state === "ready" ? (
            <div className="flex flex-wrap items-center gap-2">
              {cameraEditMode ? (
                <>
                  <Button type="button" size="sm" onClick={handleAcceptCamera}>
                    <Check className="h-3.5 w-3.5" aria-hidden />
                    {viewFlash ? t("cameraViewSaved") : t("acceptCamera")}
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={handleCancelCameraEdit}>
                    {t("cancelCamera")}
                  </Button>
                </>
              ) : (
                <>
                  <Button type="button" variant="outline" size="sm" onClick={handleEnterCameraEdit}>
                    <Camera className="h-3.5 w-3.5" aria-hidden />
                    {t("editCamera")}
                  </Button>
                  {savedReference ? (
                    <Button type="button" variant="outline" size="sm" onClick={handleResetView}>
                      <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                      {t("cameraViewReset")}
                    </Button>
                  ) : null}
                </>
              )}
            </div>
          ) : null}
        </div>

        <div
          className={cn(
            "relative aspect-[21/9] w-full overflow-hidden rounded-xl border border-border/60 bg-muted/30",
            cameraEditMode && "ring-2 ring-primary ring-offset-2 ring-offset-background",
          )}
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
          {cameraEditMode && state === "ready" ? (
            <div className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-background/90 px-3 py-1.5 text-xs text-muted-foreground shadow-sm backdrop-blur">
              {t("cameraEditHint")}
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
                  onClick={() => {
                    setCameraEditMode(false)
                    cameraSnapshotRef.current = null
                    setPendingCoords(null)
                    setEditMode(true)
                  }}
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
                  onClick={handleAcceptPin}
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
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm leading-relaxed sm:text-base">
                <a href={mapsHref} target="_blank" rel="noopener noreferrer" className={addressLinkClass}>
                  {formattedAddress}
                </a>
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditAddress(addressFields.address)
                    setEditCity(addressFields.city)
                    setEditCountry(addressFields.country)
                    setAddressOpen(true)
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden />
                  {t("editAddress")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchAddressQuery("")
                    setSearchAddressResult(null)
                    setSearchAddressError(null)
                    setSearchAddressOpen(true)
                  }}
                >
                  <Search className="h-3.5 w-3.5" aria-hidden />
                  {t("searchAddress")}
                </Button>
                {addressAdjusted && onAddressReset ? (
                  <Button type="button" variant="outline" size="sm" onClick={onAddressReset}>
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                    {t("resetAddress")}
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
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

      <Dialog open={addressOpen} onOpenChange={setAddressOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("editAddressModalTitle")}</DialogTitle>
            <DialogDescription>{t("editAddressModalDescription")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-address">{t("editAddressStreetLabel")}</Label>
              <Input
                id="edit-address"
                type="text"
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-city">{t("editAddressCityLabel")}</Label>
              <Input
                id="edit-city"
                type="text"
                value={editCity}
                onChange={(e) => setEditCity(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-country">{t("editAddressCountryLabel")}</Label>
              <Input
                id="edit-country"
                type="text"
                value={editCountry}
                onChange={(e) => setEditCountry(e.target.value)}
              />
            </div>
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
                onAddressChange({
                  address: editAddress.trim(),
                  city: editCity.trim(),
                  country: editCountry.trim(),
                })
                setAddressOpen(false)
              }}
            >
              {t("editAddressApply")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={searchAddressOpen} onOpenChange={setSearchAddressOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("searchAddressModalTitle")}</DialogTitle>
            <DialogDescription>{t("searchAddressModalDescription")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <PlaceAddressSearch
              value={searchAddressQuery}
              onChange={(v) => {
                setSearchAddressQuery(v)
                // PlaceAddressSearch echoes the picked place_name via onChange right
                // after onSelect — only clear the pending result if this is the user
                // typing something new, not that echo.
                setSearchAddressResult((prev) => (prev && prev.place_name === v ? prev : null))
              }}
              onSelect={(result) => {
                setSearchAddressResult(result)
                setSearchAddressError(null)
              }}
              onError={(msg) => setSearchAddressError(msg || null)}
              searchTypes={DEFAULT_MAPBOX_SEARCH_TYPES}
              placeholder={t("searchAddressPlaceholder")}
            />
            {searchAddressError ? (
              <p className="text-xs text-destructive">{searchAddressError}</p>
            ) : null}
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
              disabled={!searchAddressResult}
              onClick={() => {
                if (!searchAddressResult) return
                onFullAddressChange({
                  lat: searchAddressResult.lat,
                  lng: searchAddressResult.lng,
                  address: addressFieldsFromSelectResult(searchAddressResult),
                })
                setSearchAddressOpen(false)
              }}
            >
              {t("searchAddressApply")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
