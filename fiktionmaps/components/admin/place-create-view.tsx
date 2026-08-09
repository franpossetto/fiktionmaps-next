"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { ArrowLeft, Loader2 } from "lucide-react"
import { useTranslations } from "next-intl"
import type { LatLng, MapControlHandle } from "@/lib/map/types"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FormField } from "./form-field"
import { LocationImageCropper } from "./location-image-cropper"
import {
  LOCATION_TYPE_OPTIONS,
  PLACE_LOCATION_DEFAULT_CENTER,
  DEFAULT_MAPBOX_SEARCH_TYPES,
  PlaceAddressSearchWithFilters,
  PlaceLocationMap,
  flyMapToLocation,
  resolveCityId,
  type MapboxSearchType,
} from "@/components/places/place-location-picker"
import type { City } from "@/src/cities/domain/city.entity"
import type { Fiction } from "@/src/fictions/domain/fiction.entity"
import { SHOOT_ENVIRONMENT_OPTIONS } from "@/src/places/domain/place-shoot-environment"
import type { PlaceShootEnvironment } from "@/src/places/domain/place-shoot-environment"
import { cn } from "@/lib/utils"

const PLACE_MAP_ID = "admin-place-map"

export type { PlaceFormData } from "@/components/places/place-form-data"
export { LOCATION_TYPE_OPTIONS } from "@/components/places/place-location-picker"

import type { PlaceFormData } from "@/components/places/place-form-data"

type LocationInputMode = "search" | "manual"

function parseLatLng(latStr: string, lngStr: string): LatLng | null {
  const lat = parseFloat(latStr.replace(",", "."))
  const lng = parseFloat(lngStr.replace(",", "."))
  if (
    Number.isNaN(lat) ||
    Number.isNaN(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return null
  }
  return { lat, lng }
}

function formatCoord(value: number): string {
  return Number.isFinite(value) ? String(value) : ""
}

interface PlaceCreateViewProps {
  fictions: Fiction[]
  cities: City[]
  initialFormData: PlaceFormData
  placeId?: string
  initialImageUrl?: string | null
  onBack: () => void
  onSubmit: (data: PlaceFormData) => Promise<void>
  submitError: string | null
}

export function PlaceCreateView({
  fictions,
  cities,
  initialFormData,
  placeId,
  initialImageUrl,
  onBack,
  onSubmit,
  submitError,
}: PlaceCreateViewProps) {
  const tPlaces = useTranslations("Places")
  const isEdit = !!placeId
  const [formData, setFormData] = useState<PlaceFormData>(initialFormData)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [crop, setCrop] = useState({ x: 0, y: 0, scale: 1 })
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [acceptedUrl, setAcceptedUrl] = useState<string | null>(null)
  const [locationMode, setLocationMode] = useState<LocationInputMode>(
    isEdit ? "manual" : "search",
  )
  const [addressLocked, setAddressLocked] = useState(false)
  const [searchTypes, setSearchTypes] = useState<MapboxSearchType[]>(DEFAULT_MAPBOX_SEARCH_TYPES)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmCityId, setConfirmCityId] = useState("")
  const mapControlRef = useRef<MapControlHandle | null>(null)
  const [manualLat, setManualLat] = useState(() => formatCoord(initialFormData.latitude))
  const [manualLng, setManualLng] = useState(() => formatCoord(initialFormData.longitude))
  const [manualCoordsError, setManualCoordsError] = useState(false)

  useEffect(() => {
    if (formData.image) {
      const url = URL.createObjectURL(formData.image)
      setPreviewUrl(url)
      return () => URL.revokeObjectURL(url)
    }
    if (isEdit && initialImageUrl) {
      setPreviewUrl(initialImageUrl)
      return
    }
    setPreviewUrl(null)
  }, [formData.image, isEdit, initialImageUrl])

  const applyCoords = useCallback((coords: LatLng) => {
    setFormData((prev) => ({
      ...prev,
      latitude: coords.lat,
      longitude: coords.lng,
    }))
    setManualLat(formatCoord(coords.lat))
    setManualLng(formatCoord(coords.lng))
    setManualCoordsError(false)
    flyMapToLocation(mapControlRef.current, coords.lat, coords.lng, 17)
  }, [])

  const handleAddressSelect = useCallback(
    (result: {
      lat: number
      lng: number
      place_name: string
      text: string
      context?: Array<{ id: string; text: string }>
    }) => {
      const cityId = resolveCityId(result.context, result.place_name, cities)
      const suggestedName =
        result.text || result.place_name.split(",")[0]?.trim() || "Place"
      setFormData((prev) => ({
        ...prev,
        latitude: result.lat,
        longitude: result.lng,
        formattedAddress: result.place_name,
        address: result.place_name,
        locationName: prev.locationName || suggestedName,
        placeName: prev.placeName || suggestedName,
        cityId,
      }))
      setManualLat(formatCoord(result.lat))
      setManualLng(formatCoord(result.lng))
      setManualCoordsError(false)
      setAddressLocked(true)
      flyMapToLocation(mapControlRef.current, result.lat, result.lng)
    },
    [cities],
  )

  const handleAddressClear = useCallback(() => {
    setAddressLocked(false)
    setFormData((p) => ({
      ...p,
      address: "",
      formattedAddress: "",
      latitude: Number.NaN,
      longitude: Number.NaN,
      cityId: isEdit ? p.cityId : "",
    }))
    setManualLat("")
    setManualLng("")
  }, [isEdit])

  const switchLocationMode = useCallback(
    (mode: LocationInputMode) => {
      setLocationMode(mode)
      setManualCoordsError(false)
      if (mode === "manual") {
        setManualLat(formatCoord(formData.latitude))
        setManualLng(formatCoord(formData.longitude))
        setAddressLocked(false)
      }
    },
    [formData.latitude, formData.longitude],
  )

  const handleApplyManualCoords = useCallback(() => {
    const coords = parseLatLng(manualLat, manualLng)
    if (!coords) {
      setManualCoordsError(true)
      return
    }
    applyCoords(coords)
  }, [applyCoords, manualLat, manualLng])

  const handleManualAddressChange = useCallback((value: string) => {
    setFormData((prev) => ({
      ...prev,
      address: value,
      formattedAddress: value,
    }))
  }, [])

  const validate = useCallback((): boolean => {
    const next: Record<string, string> = {}
    if (!formData.fictionId) next.fictionId = "Fiction is required"
    if (!(formData.formattedAddress || formData.address)?.trim()) {
      next.address = "Address is required"
    } else if (!Number.isFinite(formData.latitude) || !Number.isFinite(formData.longitude)) {
      next.address = "Set latitude and longitude (or click the map)"
    }
    if (!formData.locationName?.trim()) next.locationName = "Location name is required"
    if (!formData.placeName?.trim()) next.placeName = "Place name is required"
    if (!formData.description?.trim()) next.description = "Description is required"
    if (!isEdit && !formData.image) next.image = "Place image is required"
    setErrors(next)
    return Object.keys(next).length === 0
  }, [formData, isEdit])

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      if (!validate()) return
      if (isEdit) {
        setSubmitting(true)
        setErrors({})
        onSubmit({ ...formData, cityId: formData.cityId || "" })
          .finally(() => setSubmitting(false))
        return
      }
      setConfirmCityId(formData.cityId || "")
      setConfirmOpen(true)
    },
    [formData, validate, isEdit, onSubmit],
  )

  const handleConfirmCreate = useCallback(async () => {
    if (!confirmCityId.trim()) return
    const data = { ...formData, cityId: confirmCityId }
    setSubmitting(true)
    setErrors({})
    try {
      await onSubmit(data)
      setConfirmOpen(false)
    } finally {
      setSubmitting(false)
    }
  }, [formData, confirmCityId, onSubmit])

  const safeCenter =
    Number.isFinite(formData.latitude) && Number.isFinite(formData.longitude)
      ? { lat: formData.latitude, lng: formData.longitude }
      : PLACE_LOCATION_DEFAULT_CENTER

  return (
    <div className="fixed inset-0 bottom-[70px] z-[3000] flex min-h-0 flex-col bg-background md:bottom-0 md:flex-row">
      <div className="flex w-full shrink-0 flex-col overflow-y-auto border-r border-border bg-card/30 md:w-[480px] md:max-w-[480px]">
        <div className="space-y-6 p-4 sm:p-6">
          <div>
            <button
              type="button"
              onClick={onBack}
              className="mb-3 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Places
            </button>
            <h2 className="text-xl font-bold text-foreground">{isEdit ? "Edit place" : "Create Place"}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {isEdit
                ? "Update place and location details, including address and coordinates."
                : "Choose a fiction and pick an address or coordinates. Place and location are created together."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField label="Fiction" required error={errors.fictionId}>
              <Select
                value={formData.fictionId || undefined}
                onValueChange={(v) => setFormData((p) => ({ ...p, fictionId: v }))}
              >
                <SelectTrigger className="h-10 w-full rounded-lg">
                  <SelectValue placeholder="Select fiction" />
                </SelectTrigger>
                <SelectContent className="z-[10000]">
                  {fictions.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <div className="flex items-center gap-2 pt-1">
              <input
                id="is-landmark"
                type="checkbox"
                checked={formData.isLandmark}
                onChange={(e) => setFormData((p) => ({ ...p, isLandmark: e.target.checked }))}
                className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-ring"
              />
              <label htmlFor="is-landmark" className="text-xs text-muted-foreground">
                Mark this as a landmark / famous place
              </label>
            </div>

            <div
              className="flex rounded-xl border border-border bg-muted/30 p-1"
              role="tablist"
              aria-label="How to set the location"
            >
              <button
                type="button"
                role="tab"
                aria-selected={locationMode === "search"}
                onClick={() => switchLocationMode("search")}
                className={cn(
                  "flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  locationMode === "search"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Search
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={locationMode === "manual"}
                onClick={() => switchLocationMode("manual")}
                className={cn(
                  "flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  locationMode === "manual"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Coordinates
              </button>
            </div>

            {locationMode === "search" ? (
              <FormField label="Address" required error={errors.address}>
                {addressLocked ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={formData.formattedAddress || formData.address}
                      className="h-9 min-w-0 flex-1 cursor-not-allowed truncate rounded-lg border border-border bg-muted/50 px-3 text-sm text-foreground"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddressClear}
                      className="shrink-0"
                    >
                      Change
                    </Button>
                  </div>
                ) : (
                  <PlaceAddressSearchWithFilters
                    value={formData.address}
                    onChange={(v) => setFormData((p) => ({ ...p, address: v }))}
                    onSelect={handleAddressSelect}
                    searchTypes={searchTypes}
                    onSearchTypesChange={setSearchTypes}
                    placeholder="Search address, intersection, or place…"
                    intersectionHint="For intersections use both street names, e.g. LaSalle St and Adams St, Chicago."
                  />
                )}
              </FormField>
            ) : (
              <div className="space-y-3">
                <FormField label="Address" required error={errors.address}>
                  <input
                    type="text"
                    value={formData.formattedAddress || formData.address}
                    onChange={(e) => handleManualAddressChange(e.target.value)}
                    placeholder="Street, number, city, country…"
                    className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </FormField>
                <p className="text-xs text-muted-foreground">
                  Paste coordinates from Google Maps, then apply — or click the map to place the pin.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="admin-manual-lat">Latitude</Label>
                    <Input
                      id="admin-manual-lat"
                      type="text"
                      inputMode="decimal"
                      placeholder="e.g. 37.565081"
                      value={manualLat}
                      onChange={(e) => {
                        setManualLat(e.target.value)
                        setManualCoordsError(false)
                      }}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="admin-manual-lng">Longitude</Label>
                    <Input
                      id="admin-manual-lng"
                      type="text"
                      inputMode="decimal"
                      placeholder="e.g. 126.922154"
                      value={manualLng}
                      onChange={(e) => {
                        setManualLng(e.target.value)
                        setManualCoordsError(false)
                      }}
                    />
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="button" size="sm" onClick={handleApplyManualCoords}>
                    Show on map
                  </Button>
                  {manualCoordsError ? (
                    <p className="text-xs text-destructive">
                      Enter valid latitude (−90 to 90) and longitude (−180 to 180).
                    </p>
                  ) : null}
                </div>
              </div>
            )}

            {isEdit ? (
              <FormField label="City">
                <Select
                  value={formData.cityId || undefined}
                  onValueChange={(v) => setFormData((p) => ({ ...p, cityId: v }))}
                >
                  <SelectTrigger className="h-10 w-full rounded-lg">
                    <SelectValue placeholder="Select city" />
                  </SelectTrigger>
                  <SelectContent className="z-[10000]">
                    {cities.map((city) => (
                      <SelectItem key={city.id} value={city.id}>
                        {city.name}, {city.country}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            ) : null}

            <FormField label="Location type">
              <Select
                value={formData.locationType || undefined}
                onValueChange={(v) => setFormData((p) => ({ ...p, locationType: v }))}
              >
                <SelectTrigger className="h-10 w-full rounded-lg">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent className="z-[10000]">
                  {LOCATION_TYPE_OPTIONS.filter((opt) => opt.value).map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField label={tPlaces("fieldShootEnvironment")}>
              <Select
                value={formData.shootEnvironment || undefined}
                onValueChange={(v) =>
                  setFormData((p) => ({ ...p, shootEnvironment: v as PlaceShootEnvironment }))
                }
              >
                <SelectTrigger className="h-10 w-full rounded-lg">
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent className="z-[10000]">
                  {SHOOT_ENVIRONMENT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {tPlaces(opt.labelKey)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="Location name" required error={errors.locationName}>
              <input
                type="text"
                value={formData.locationName}
                onChange={(e) => setFormData((p) => ({ ...p, locationName: e.target.value }))}
                placeholder="e.g. King's Cross Station"
                className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </FormField>

            <FormField label="Place name" required error={errors.placeName}>
              <input
                type="text"
                value={formData.placeName}
                onChange={(e) => setFormData((p) => ({ ...p, placeName: e.target.value }))}
                placeholder="e.g. Platform 9¾"
                className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </FormField>

            <FormField label="Description" required error={errors.description}>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                placeholder="What happens here in the story?"
                rows={3}
                className="w-full resize-none rounded-lg border border-border bg-background px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </FormField>

            <FormField label="Place image" required error={errors.image}>
              <LocationImageCropper
                file={formData.image}
                previewUrl={previewUrl}
                acceptedUrl={acceptedUrl}
                crop={crop}
                aspect={3 / 2}
                onFileChange={(file) => {
                  setFormData((p) => ({ ...p, image: file }))
                  setAcceptedUrl(null)
                  setCrop({ x: 0, y: 0, scale: 1 })
                }}
                onCropChange={setCrop}
                onAccept={(url) => setAcceptedUrl(url)}
                onRemove={() => {
                  setFormData((p) => ({ ...p, image: undefined }))
                  setPreviewUrl(null)
                  setAcceptedUrl(null)
                }}
              />
            </FormField>

            {submitError ? (
              <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
                {submitError}
              </p>
            ) : null}

            <div className="flex gap-3">
              <Button type="button" variant="outline" className="shrink-0" onClick={onBack} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" variant="cta" className="flex-1 gap-2" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {isEdit ? "Saving…" : "Creating…"}
                  </>
                ) : isEdit ? (
                  "Save"
                ) : (
                  "Create Place"
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>

      {!isEdit ? (
        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Confirm place</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Select the city for this place: <strong>{formData.address || formData.placeName}</strong>
            </p>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">City</label>
              <Select value={confirmCityId || undefined} onValueChange={(v) => setConfirmCityId(v)}>
                <SelectTrigger className="h-10 w-full rounded-lg">
                  <SelectValue placeholder="Select city" />
                </SelectTrigger>
                <SelectContent className="z-[10000]">
                  {cities.map((city) => (
                    <SelectItem key={city.id} value={city.id}>
                      {city.name}, {city.country}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setConfirmOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="cta"
                onClick={handleConfirmCreate}
                disabled={!confirmCityId.trim() || submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating…
                  </>
                ) : (
                  "Create Place"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}

      <div className="relative min-h-[50vh] flex-1 md:min-h-0">
        <PlaceLocationMap
          mapId={PLACE_MAP_ID}
          mapKey="place-create-map"
          latitude={
            Number.isFinite(formData.latitude) ? formData.latitude : safeCenter.lat
          }
          longitude={
            Number.isFinite(formData.longitude) ? formData.longitude : safeCenter.lng
          }
          placeName={formData.placeName}
          previewUrl={acceptedUrl || previewUrl}
          pinEditMode={locationMode === "manual"}
          onMapClick={applyCoords}
          onMapReady={(ctrl) => {
            mapControlRef.current = ctrl
          }}
        />
        {locationMode === "manual" ? (
          <p className="pointer-events-none absolute bottom-3 left-3 right-3 rounded-lg bg-background/90 px-3 py-2 text-xs text-muted-foreground shadow-sm backdrop-blur-sm md:left-auto md:right-3 md:max-w-sm">
            Click the map to move the pin. Edit the address on the left to match the real place.
          </p>
        ) : null}
      </div>
    </div>
  )
}
