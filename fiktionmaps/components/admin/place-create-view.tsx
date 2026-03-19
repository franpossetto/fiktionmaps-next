"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Search, X, ArrowLeft, Loader2, MapPin } from "lucide-react"
import { MapProvider, MapContainer, MapMarker } from "@/lib/map"
import type { MapControlHandle } from "@/lib/map/types"
import { MAPBOX_ACCESS_TOKEN } from "@/lib/map/mapbox/styles"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { FormField } from "./form-field"
import { LocationImageCropper } from "./location-image-cropper"
import type { City } from "@/src/cities/city.domain"
import type { Fiction } from "@/src/fictions/fiction.domain"

const GEOCODE_URL = "https://api.mapbox.com/geocoding/v5/mapbox.places"
const PLACE_MAP_ID = "admin-place-map"
const DEFAULT_CENTER = { lat: 48.8566, lng: 2.3522 }
const DEFAULT_ZOOM = 10
const MIN_ZOOM = 0
const MAX_ZOOM = 22
const FLY_DURATION = 1200

interface MapboxFeature {
  id: string
  text: string
  place_name: string
  center: [number, number]
  context?: Array<{ id: string; text: string }>
}

/** Location type options for the Create Place form (stored on locations.type). */
export const LOCATION_TYPE_OPTIONS = [
  { value: "", label: "Select type" },
  { value: "street", label: "Street" },
  { value: "square", label: "Square" },
  { value: "park", label: "Park" },
  { value: "building", label: "Building" },
  { value: "restaurant", label: "Restaurant" },
  { value: "bar", label: "Bar" },
  { value: "cafe", label: "Cafe" },
  { value: "hotel", label: "Hotel" },
  { value: "station", label: "Station" },
  { value: "bridge", label: "Bridge" },
  { value: "monument", label: "Monument" },
  { value: "museum", label: "Museum" },
  { value: "landmark", label: "Landmark" },
  { value: "other", label: "Other" },
] as const

export interface PlaceFormData {
  fictionId: string
  address: string
  name: string
  description: string
  latitude: number
  longitude: number
  formattedAddress: string
  cityId: string
  locationType: string
  image?: File
  isLandmark: boolean
}

interface PlaceCreateViewProps {
  fictions: Fiction[]
  cities: City[]
  initialFormData: PlaceFormData
  /** When set, form is in edit mode: title "Edit place", image optional, no city confirm dialog. */
  placeId?: string
  /** In edit mode, current image URL for preview when no new file selected. */
  initialImageUrl?: string | null
  onBack: () => void
  onSubmit: (data: PlaceFormData) => Promise<void>
  submitError: string | null
}

function AddressSearch({
  value,
  onChange,
  onSelect,
  onError,
}: {
  value: string
  onChange: (v: string) => void
  onSelect: (result: {
    lat: number
    lng: number
    place_name: string
    text: string
    context?: Array<{ id: string; text: string }>
  }) => void
  onError?: (msg: string) => void
}) {
  const [loading, setLoading] = useState(false)
  const [predictions, setPredictions] = useState<MapboxFeature[]>([])

  const search = useCallback(async (input: string) => {
    if (!MAPBOX_ACCESS_TOKEN || input.trim().length < 2) {
      setPredictions([])
      return
    }
    try {
      const params = new URLSearchParams({
        access_token: MAPBOX_ACCESS_TOKEN,
        autocomplete: "true",
        types: "address,place,poi",
        limit: "5",
        language: "en",
      })
      const res = await fetch(`${GEOCODE_URL}/${encodeURIComponent(input)}.json?${params}`)
      if (!res.ok) return
      const data = await res.json()
      setPredictions((data.features ?? []) as MapboxFeature[])
    } catch {
      setPredictions([])
    }
  }, [])

  useEffect(() => {
    if (!value.trim()) {
      setPredictions([])
      return
    }
    const t = setTimeout(() => search(value), 300)
    return () => clearTimeout(t)
  }, [value, search])

  const handleSelect = useCallback(
    (feature: MapboxFeature) => {
      const [lng, lat] = feature.center
      onSelect({
        lat,
        lng,
        place_name: feature.place_name,
        text: feature.text,
        context: feature.context,
      })
      onChange(feature.place_name)
      setPredictions([])
      onError?.("")
    },
    [onSelect, onChange, onError],
  )

  return (
    <div className="relative w-full">
      <div className="relative flex items-center">
        <Search className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search address (e.g. street, building, landmark)"
          autoComplete="off"
          className="w-full h-9 pl-10 pr-10 py-2 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {value && (
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onChange("")}
            className="absolute right-3 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {loading && (
        <div className="absolute top-full left-0 right-0 px-3 py-2 bg-background border border-border rounded-b-lg text-xs text-muted-foreground">
          Searching…
        </div>
      )}
      {predictions.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-0.5 border border-border rounded-lg bg-background shadow-lg overflow-hidden">
          {predictions.map((feature) => (
            <button
              key={feature.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelect(feature)}
              className="w-full text-left px-4 py-3 text-sm text-foreground hover:bg-muted transition-colors border-b border-border last:border-b-0"
            >
              {feature.place_name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/** Resolve city_id from Mapbox context (place name + country) by matching our cities. */
function resolveCityId(
  context: Array<{ id: string; text: string }> | undefined,
  placeName: string,
  cities: City[],
): string {
  const countryContext = context?.find((c) => c.id.startsWith("country."))
  const regionContext = context?.find((c) => c.id.startsWith("region.") || c.id.startsWith("place."))
  const country = countryContext?.text ?? ""
  const regionOrPlace = regionContext?.text ?? placeName.split(",")[0]?.trim() ?? ""

  for (const city of cities) {
    if (city.country !== country) continue
    if (city.name === regionOrPlace) return city.id
    if (regionOrPlace.toLowerCase().includes(city.name.toLowerCase())) return city.id
    if (city.name.toLowerCase().includes(regionOrPlace.toLowerCase())) return city.id
  }
  return cities[0]?.id ?? ""
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
  const isEdit = !!placeId
  const [formData, setFormData] = useState<PlaceFormData>(initialFormData)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [crop, setCrop] = useState({ x: 0, y: 0, scale: 1 })
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [acceptedUrl, setAcceptedUrl] = useState<string | null>(null)
  const [addressLocked, setAddressLocked] = useState(!!placeId)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmCityId, setConfirmCityId] = useState("")
  const mapControlRef = useRef<MapControlHandle | null>(null)
  const [mapReady, setMapReady] = useState(false)

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

  const handleAddressSelect = useCallback(
    (result: { lat: number; lng: number; place_name: string; text: string; context?: Array<{ id: string; text: string }> }) => {
      const cityId = resolveCityId(result.context, result.place_name, cities)
      setFormData((prev) => ({
        ...prev,
        latitude: result.lat,
        longitude: result.lng,
        formattedAddress: result.place_name,
        address: result.place_name,
        name: prev.name || result.text || result.place_name.split(",")[0]?.trim() || "Place",
        cityId,
      }))
      mapControlRef.current?.flyTo({
        center: { lat: result.lat, lng: result.lng },
        zoom: 15,
        duration: FLY_DURATION,
      })
    },
    [cities],
  )

  const validate = useCallback((): boolean => {
    const next: Record<string, string> = {}
    if (!formData.fictionId) next.fictionId = "Fiction is required"
    if (!formData.address?.trim()) next.address = "Address is required"
    if (!formData.name?.trim()) next.name = "Place name is required"
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

  const handleConfirmCreate = useCallback(
    async () => {
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
    },
    [formData, confirmCityId, onSubmit],
  )

  const selectedFiction = fictions.find((f) => f.id === formData.fictionId)
  const safeCenter =
    Number.isFinite(formData.latitude) && Number.isFinite(formData.longitude)
      ? { lat: formData.latitude, lng: formData.longitude }
      : DEFAULT_CENTER

  return (
    <div className="fixed inset-0 bottom-[70px] md:bottom-0 md:left-[60px] z-[3000] bg-background flex flex-col md:flex-row min-h-0">
      {/* Left: form + image */}
      <div className="w-full md:w-[420px] md:max-w-[420px] flex flex-col border-r border-border bg-card/30 overflow-y-auto shrink-0">
        <div className="p-4 sm:p-6 space-y-6">
          <div>
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-3"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Places
            </button>
            <h2 className="text-xl font-bold text-foreground">
              {isEdit ? "Edit place" : "Create Place"}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {isEdit
                ? "Update place and location details."
                : "Choose a fiction and pick an address. Place and location are created together."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField label="Fiction" required error={errors.fictionId}>
              <select
                value={formData.fictionId}
                onChange={(e) => setFormData((p) => ({ ...p, fictionId: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Select fiction</option>
                {fictions.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.title}
                  </option>
                ))}
              </select>
            </FormField>

            <div className="flex items-center gap-2 pt-1">
              <input
                id="is-landmark"
                type="checkbox"
                checked={formData.isLandmark}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, isLandmark: e.target.checked }))
                }
                className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-ring"
              />
              <label htmlFor="is-landmark" className="text-xs text-muted-foreground">
                Mark this as a landmark / famous place
              </label>
            </div>

            <FormField label="Address" required error={errors.address}>
              {addressLocked ? (
                <input
                  type="text"
                  readOnly
                  value={formData.formattedAddress || formData.address}
                  className="w-full min-w-0 h-9 px-3 rounded-lg border border-border bg-muted/50 text-foreground text-sm cursor-not-allowed truncate"
                />
              ) : (
                <div className="flex gap-2 items-center">
                  <div className="flex-1 min-w-0">
                    <AddressSearch
                      value={formData.address}
                      onChange={(v) => setFormData((p) => ({ ...p, address: v }))}
                      onSelect={handleAddressSelect}
                    />
                  </div>
                  {Number.isFinite(formData.latitude) &&
                    Number.isFinite(formData.longitude) &&
                    (formData.formattedAddress || formData.address) && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => setAddressLocked(true)}
                        className="shrink-0"
                      >
                        Select
                      </Button>
                    )}
                </div>
              )}
            </FormField>

            <FormField label="Location type">
              <select
                value={formData.locationType}
                onChange={(e) => setFormData((p) => ({ ...p, locationType: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {LOCATION_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value || "empty"} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Place name" required error={errors.name}>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Platform 9¾"
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </FormField>

            <FormField label="Description" required error={errors.description}>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                placeholder="What happens here in the story?"
                rows={3}
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
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

            {submitError && (
              <p className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-4 py-2">
                {submitError}
              </p>
            )}

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="shrink-0"
                onClick={onBack}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="cta"
                className="flex-1 gap-2"
                disabled={submitting}
              >
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

      {!isEdit && (
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm place</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Select the city for this place: <strong>{formData.address || formData.name}</strong>
          </p>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">City</label>
            <select
              value={confirmCityId}
              onChange={(e) => setConfirmCityId(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Select city</option>
              {cities.map((city) => (
                <option key={city.id} value={city.id}>
                  {city.name}, {city.country}
                </option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmOpen(false)}
            >
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
      )}

      {/* Right: map */}
      <div className="flex-1 min-h-[50vh] md:min-h-0 relative">
        <MapProvider libraries={[]}>
          <MapContainer
            id={PLACE_MAP_ID}
            mapKey="place-create-map"
            defaultCenter={safeCenter}
            defaultZoom={DEFAULT_ZOOM}
            minZoom={MIN_ZOOM}
            maxZoom={MAX_ZOOM}
            className="h-full w-full"
            onMapReady={(ctrl) => {
              mapControlRef.current = ctrl
              setMapReady(true)
            }}
            controls={{ zoom: true }}
          >
            {mapReady && Number.isFinite(formData.latitude) && Number.isFinite(formData.longitude) && (
              <MapMarker position={{ lat: formData.latitude, lng: formData.longitude }}>
                <div className="flex flex-col items-center">
                  <div
                    className="relative h-14 w-14 overflow-hidden rounded-lg border-2 border-border"
                    style={{ filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.5))" }}
                  >
                    {acceptedUrl || previewUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={acceptedUrl || previewUrl || ""}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-muted">
                        <MapPin className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="h-0 w-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-border" />
                  <div className="mt-0.5 max-w-[140px] truncate rounded-md bg-overlay/95 px-2 py-0.5 text-center text-[10px] font-semibold text-foreground backdrop-blur-sm shadow-lg">
                    {formData.name?.trim() || "Place name"}
                  </div>
                </div>
              </MapMarker>
            )}
          </MapContainer>
        </MapProvider>
      </div>
    </div>
  )
}
