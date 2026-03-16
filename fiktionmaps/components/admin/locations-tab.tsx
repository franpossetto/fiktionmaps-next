"use client"

import { useEffect, useState } from "react"
import { Plus, Edit2, Trash2, Search, ChevronRight, MapPin, CheckCircle2, Building2 } from "lucide-react"
import type { City } from "@/src/cities/city.domain"
import type { Fiction } from "@/src/fictions/fiction.domain"
import type { Location } from "@/src/locations"
import { useApi } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { FormField } from "./form-field"
import { InteractiveMap } from "./interactive-map"
import { cn } from "@/lib/utils"
import Image from "next/image"
import { DEFAULT_FICTION_COVER } from "@/lib/constants/placeholders"
import { LocationImageCropper } from "./location-image-cropper"
import { WizardShell } from "./wizard-shell"

interface LocationFormData {
  name: string
  address: string
  city: string
  fictionId: string
  latitude: number
  longitude: number
  description: string
  sceneDescription: string
  image?: File
  videoUrl: string
}

type WorkflowStep = "list" | "select-fiction" | "select-city" | "address" | "details"

export function LocationsTab() {
  const { cities: citiesService, fictions: fictionsService, locations: locationsService } = useApi()
  const [cities, setCities] = useState<City[]>([])
  const [fictions, setFictions] = useState<Fiction[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [workflowStep, setWorkflowStep] = useState<WorkflowStep>("list")
  const [searchTerm, setSearchTerm] = useState("")
  const [fictionFilter, setFictionFilter] = useState("all")
  const [pendingLocation, setPendingLocation] = useState<{
    lat: number
    lng: number
    address?: string
  } | null>(null)
  const [nameTouched, setNameTouched] = useState(false)
  const [locationCrop, setLocationCrop] = useState({ x: 0, y: 0, scale: 1 })
  const [locationPreviewUrl, setLocationPreviewUrl] = useState<string | null>(null)
  const [locationAcceptedUrl, setLocationAcceptedUrl] = useState<string | null>(null)
  const defaultCity = cities[0]
  const [selectedCityId, setSelectedCityId] = useState<string>(defaultCity?.id ?? "")
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>(
    defaultCity ? { lat: defaultCity.lat, lng: defaultCity.lng } : { lat: 51.5074, lng: -0.1278 },
  )
  const [formData, setFormData] = useState<LocationFormData>({
    name: "",
    address: "",
    city: defaultCity?.name ?? "london",
    fictionId: "",
    latitude: 51.5074,
    longitude: -0.1278,
    description: "",
    sceneDescription: "",
    videoUrl: "",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [mapError, setMapError] = useState("")
  const wizardSteps = [
    { title: "Fiction", description: "Pick the story" },
    { title: "City", description: "Set the map focus" },
    { title: "Address", description: "Locate the place" },
    { title: "Details", description: "Name and description" },
  ]
  const stepIndex: Record<WorkflowStep, number> = {
    list: -1,
    "select-fiction": 0,
    "select-city": 1,
    address: 2,
    details: 3,
  }

  useEffect(() => {
    Promise.all([
      citiesService.getAll(),
      fictionsService.getAll(),
      locationsService.getAll(),
    ]).then(([c, f, l]) => {
      setCities(c)
      setFictions(f)
      setLocations(l)
    })
  }, [citiesService, fictionsService, locationsService])

  useEffect(() => {
    if (cities.length > 0 && !selectedCityId) {
      setSelectedCityId(cities[0].id)
      setMapCenter({ lat: cities[0].lat, lng: cities[0].lng })
      setFormData((prev) => ({
        ...prev,
        city: cities[0].name,
        latitude: cities[0].lat,
        longitude: cities[0].lng,
      }))
    }
  }, [cities, selectedCityId])

  const derivePlaceName = (address?: string) => {
    if (!address) return ""
    const [first] = address.split(",")
    return first?.trim() ?? ""
  }

  useEffect(() => {
    if (!formData.image) {
      setLocationPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(formData.image)
    setLocationPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [formData.image])

  const resetImageState = () => {
    setLocationCrop({ x: 0, y: 0, scale: 1 })
    setLocationPreviewUrl(null)
    setLocationAcceptedUrl(null)
  }

  const resetFlowState = () => {
    setErrors({})
    setPendingLocation(null)
    setMapError("")
    setNameTouched(false)
    resetImageState()
    setFormData({
      name: "",
      address: "",
      city: defaultCity?.name ?? "london",
      fictionId: "",
      latitude: defaultCity?.lat ?? 51.5074,
      longitude: defaultCity?.lng ?? -0.1278,
      description: "",
      sceneDescription: "",
      videoUrl: "",
    })
    if (defaultCity) {
      setSelectedCityId(defaultCity.id)
      setMapCenter({ lat: defaultCity.lat, lng: defaultCity.lng })
    }
  }

  const handleCancelWorkflow = () => {
    resetFlowState()
    setWorkflowStep("list")
  }

  const filteredLocations = locations.filter((loc) => {
    const matchesFiction = fictionFilter === "all" || loc.fictionId === fictionFilter
    if (!matchesFiction) return false
    if (!searchTerm.trim()) return true
    const q = searchTerm.toLowerCase()
    return (
      loc.name.toLowerCase().includes(q) ||
      loc.description.toLowerCase().includes(q) ||
      loc.address.toLowerCase().includes(q)
    )
  })

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!formData.name.trim()) newErrors.name = "Location name is required"
    if (!formData.fictionId) newErrors.fictionId = "Fiction is required"
    if (!formData.description.trim()) newErrors.description = "Description is required"
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validateForm()) {
      console.log("Submitting location:", formData)
      resetFlowState()
      setWorkflowStep("list")
    }
  }

  const handleStartWorkflow = () => {
    resetFlowState()
    setWorkflowStep("select-fiction")
  }

  const handleSelectFiction = (fictionId: string) => {
    setFormData({ ...formData, fictionId })
    setWorkflowStep("select-city")
    setPendingLocation(null)
    setMapError("")
    setNameTouched(false)
    resetImageState()
  }

  const handleCityChange = (cityId: string) => {
    const city = cities.find((c) => c.id === cityId)
    if (!city) return
    setSelectedCityId(cityId)
    setMapCenter({ lat: city.lat, lng: city.lng })
    setFormData((prev) => ({
      ...prev,
      city: city.name,
      address: "",
      latitude: city.lat,
      longitude: city.lng,
    }))
    setPendingLocation(null)
    setMapError("")
    setNameTouched(false)
    resetImageState()
  }

  const handleMapSelect = (lat: number, lng: number, address?: string) => {
    setFormData((prev) => ({
      ...prev,
      latitude: lat,
      longitude: lng,
      address: address ?? prev.address,
      name: nameTouched ? prev.name : derivePlaceName(address) || prev.name,
    }))
    setPendingLocation({ lat, lng, address })
    setMapError("")
  }

  // Step 1: List View
  if (workflowStep === "list") {
    return (
      <div className="space-y-6">
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Locations Library ({filteredLocations.length})
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Pin real places and attach them to your stories.
              </p>
            </div>
            <Button onClick={handleStartWorkflow} variant="cta" className="gap-2">
              <Plus className="h-4 w-4" />
              Create Location
            </Button>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search locations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground transition-colors"
              />
            </div>
            <select
              value={fictionFilter}
              onChange={(e) => setFictionFilter(e.target.value)}
              className="w-full sm:w-56 px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:border-foreground transition-colors"
            >
              <option value="all">All fictions</option>
              {fictions.map((fiction) => (
                <option key={fiction.id} value={fiction.id}>
                  {fiction.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLocations.map((loc) => {
            const fiction = fictions.find((f) => f.id === loc.fictionId)
            const city = cities.find((c) => c.id === loc.cityId)
            const cityLabel = city ? `${city.name}, ${city.country}` : loc.cityId
            return (
              <div
                key={loc.id}
                className="group rounded-xl border border-border hover:border-foreground/30 hover:bg-card/50 transition-all overflow-hidden"
              >
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground truncate text-base">{loc.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-medium uppercase px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                          {fiction?.title || "Fiction"}
                        </span>
                        <span className="text-xs text-muted-foreground">{cityLabel}</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground line-clamp-2">{loc.address || loc.description}</p>

                  <div className="flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity gap-2">
                    <button className="flex-1 flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-foreground/10 text-foreground hover:bg-foreground/20 transition-colors">
                      <Edit2 className="h-3 w-3" />
                      Edit
                    </button>
                    <button className="flex-1 flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors">
                      <Trash2 className="h-3 w-3" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

      </div>
    )
  }

  // Step 2: Select Fiction
  if (workflowStep === "select-fiction") {
    return (
      <WizardShell
        title="Create Location"
        subtitle="Pick the fiction, then drop a precise address."
        steps={wizardSteps}
        currentStep={stepIndex["select-fiction"]}
        onBack={handleCancelWorkflow}
        backLabel="<- Back to Library"
        onCancel={handleCancelWorkflow}
        cancelLabel="Cancel"
      >
        <div className="space-y-6 max-w-4xl">
          <div>
            <h2 className="text-lg font-bold text-foreground mb-2">Step 1: Select Fiction</h2>
            <p className="text-sm text-muted-foreground">
              Choose the story this location belongs to.
            </p>
          </div>

          <div className="space-y-3 max-h-[520px] overflow-y-auto">
            {fictions.map((fiction) => (
              <button
                key={fiction.id}
                onClick={() => handleSelectFiction(fiction.id)}
                className="w-full text-left p-4 rounded-xl border border-border hover:border-foreground/40 hover:bg-card/60 transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="relative h-[96px] w-[64px] shrink-0 overflow-hidden rounded-lg border border-border/60 bg-muted/20">
                    <Image
                      src={fiction.coverImage?.trim() || DEFAULT_FICTION_COVER}
                      alt={fiction.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-semibold text-foreground truncate">
                      {fiction.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {fiction.year} · {fiction.genre}
                    </p>
                    <p className="text-xs text-muted-foreground/80 mt-2 line-clamp-2">
                      {fiction.synopsis}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </WizardShell>
    )
  }

  // Step 2: Select City
  if (workflowStep === "select-city") {
    const selectedFiction = fictions.find((f) => f.id === formData.fictionId)
    return (
      <WizardShell
        title="Create Location"
        subtitle="Pick the fiction, then drop a precise address."
        steps={wizardSteps}
        currentStep={stepIndex["select-city"]}
        onBack={handleCancelWorkflow}
        backLabel="<- Back to Library"
        onCancel={handleCancelWorkflow}
        cancelLabel="Cancel"
      >
        <div className="space-y-6 max-w-4xl">
          <div>
            <h2 className="text-lg font-bold text-foreground mb-2">Step 2: Select City</h2>
            <p className="text-sm text-muted-foreground">
              For: <span className="font-semibold text-foreground">{selectedFiction?.title}</span>
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {cities.map((city) => (
              <button
                key={city.id}
                onClick={() => {
                  handleCityChange(city.id)
                  setWorkflowStep("address")
                }}
                className={cn(
                  "w-full rounded-xl border border-border p-4 text-left transition-all hover:border-foreground/40 hover:bg-card/60",
                  selectedCityId === city.id && "border-foreground/60 bg-foreground/5",
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-foreground/10 text-foreground flex items-center justify-center">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{city.name}</p>
                    <p className="text-xs text-muted-foreground">{city.country}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <Button variant="outline" onClick={() => setWorkflowStep("select-fiction")} className="w-full">
            Back
          </Button>
        </div>
      </WizardShell>
    )
  }

  // Step 3: Address
  if (workflowStep === "address") {
    const selectedFiction = fictions.find((f) => f.id === formData.fictionId)
    const selectedCity = cities.find((c) => c.id === selectedCityId)
    return (
      <WizardShell
        title="Create Location"
        subtitle="Pick the fiction, then drop a precise address."
        steps={wizardSteps}
        currentStep={stepIndex.address}
        onBack={handleCancelWorkflow}
        backLabel="<- Back to Library"
        onCancel={handleCancelWorkflow}
        cancelLabel="Cancel"
      >
        <div className="space-y-6 max-w-5xl">
          <div>
            <h2 className="text-lg font-bold text-foreground mb-2">Step 3: Address</h2>
            <p className="text-sm text-muted-foreground">
              {selectedCity?.name} · {selectedFiction?.title}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Enter the full address and press Enter, or click directly on the map.
            </p>
          </div>

          <InteractiveMap
            center={mapCenter}
            locations={locations.filter((l) => l.fictionId === formData.fictionId)}
            onLocationSelect={handleMapSelect}
            selected={pendingLocation ?? undefined}
            addressValue={formData.address}
            onAddressChange={(value) => {
              setFormData((prev) => ({ ...prev, address: value }))
              setMapError("")
            }}
            onError={setMapError}
          />

          {(pendingLocation?.address || formData.address) && (
            <div className="rounded-lg border border-border bg-card/50 px-4 py-3 text-sm text-muted-foreground">
              Selected:{" "}
              <span className="text-foreground">
                {pendingLocation?.address ?? formData.address}
              </span>
            </div>
          )}

          {mapError && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600">
              {mapError}
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setWorkflowStep("select-city")} className="flex-1">
              Back
            </Button>
            <Button
              className="flex-1 gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
              onClick={() => {
                if (!pendingLocation) {
                  setMapError("Pick a location on the map or enter an address.")
                  return
                }
                setWorkflowStep("details")
              }}
            >
              Continue
            </Button>
          </div>
        </div>
      </WizardShell>
    )
  }

  // Step 3: Location Details
  if (workflowStep === "details") {
    const selectedFiction = fictions.find((f) => f.id === formData.fictionId)
    const selectedCity = cities.find((c) => c.id === selectedCityId)
    return (
      <WizardShell
        title="Create Location"
        subtitle="Pick the fiction, then drop a precise address."
        steps={wizardSteps}
        currentStep={stepIndex.details}
        onBack={handleCancelWorkflow}
        backLabel="<- Back to Library"
        onCancel={handleCancelWorkflow}
        cancelLabel="Cancel"
      >
        <form onSubmit={handleSubmit} className="space-y-6 w-full">
          <div className="space-y-2">
            <h2 className="text-lg font-bold text-foreground mb-2">Step 4: Place Data</h2>
            <p className="text-sm text-muted-foreground">Name it, describe it, and add a screenshot.</p>
            <div className="flex items-center gap-2 mt-4 p-3 rounded-lg bg-foreground/10 border border-foreground/30">
              <CheckCircle2 className="h-4 w-4 text-foreground" />
              <span className="text-xs font-medium text-foreground">Fiction: {selectedFiction?.title}</span>
            </div>
            {selectedCity && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-foreground/10 border border-foreground/30">
                <CheckCircle2 className="h-4 w-4 text-foreground" />
                <span className="text-xs font-medium text-foreground">City: {selectedCity.name}</span>
              </div>
            )}
            <div className="flex items-center gap-2 p-3 rounded-lg bg-foreground/10 border border-foreground/30">
              <CheckCircle2 className="h-4 w-4 text-foreground" />
              <span className="text-xs font-medium text-foreground">
                Address: {formData.address || "Not set"}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <FormField label="Location Name" required error={errors.name}>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => {
                  setNameTouched(true)
                  setFormData({ ...formData, name: e.target.value })
                }}
                placeholder="e.g., Platform 9¾"
                className="w-full px-4 py-2 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground/20 transition-all"
              />
            </FormField>
          </div>

          <FormField label="Description" required error={errors.description}>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Location description..."
              rows={3}
              className="w-full px-4 py-2 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground/20 transition-all resize-none"
            />
          </FormField>

          <FormField label="Location Image">
            <LocationImageCropper
              file={formData.image}
              previewUrl={locationPreviewUrl}
              acceptedUrl={locationAcceptedUrl}
              crop={locationCrop}
              onFileChange={(file) => {
                setFormData({ ...formData, image: file })
                setLocationAcceptedUrl(null)
                setLocationCrop({ x: 0, y: 0, scale: 1 })
              }}
              onCropChange={setLocationCrop}
              onAccept={(dataUrl) => setLocationAcceptedUrl(dataUrl)}
              onRemove={() => {
                setFormData({ ...formData, image: undefined })
                resetImageState()
              }}
            />
          </FormField>

          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1 gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700">
              Create Location
            </Button>
            <Button type="button" variant="outline" onClick={() => setWorkflowStep("address")}>
              Back
            </Button>
          </div>
        </form>
      </WizardShell>
    )
  }

  return null
}
