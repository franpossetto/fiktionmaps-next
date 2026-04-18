"use client"

import { useEffect, useState } from "react"
import { Plus, Edit2, Trash2, Search, MapPin } from "lucide-react"
import type { City } from "@/src/cities/domain/city.entity"
import type { Fiction } from "@/src/fictions/domain/fiction.entity"
import type { Location } from "@/src/locations/domain/location.entity"
import { Button } from "@/components/ui/button"
import { PlaceCreateView, type PlaceFormData } from "./place-create-view"
import { uploadPlaceImageAction } from "@/src/places/infrastructure/next/place.actions"
import {
  createPlaceAction,
  updatePlaceAction,
  getAllPlacesAction,
} from "@/src/places/infrastructure/next/place.actions"

type WorkflowStep = "list" | "create" | "edit"

interface LocationsTabProps {
  initialLocations?: Location[]
  initialFictions?: Fiction[]
  initialCities?: City[]
}

export function LocationsTab({ initialLocations, initialFictions = [], initialCities = [] }: LocationsTabProps) {
  const [cities, setCities] = useState<City[]>(initialCities)
  const [fictions, setFictions] = useState<Fiction[]>(initialFictions)
  const [locations, setLocations] = useState<Location[]>(initialLocations ?? [])
  const [workflowStep, setWorkflowStep] = useState<WorkflowStep>("list")
  const [editingLocation, setEditingLocation] = useState<Location | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [fictionFilter, setFictionFilter] = useState("all")
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    setLocations(initialLocations ?? [])
  }, [initialLocations])

  const defaultCity = cities[0]
  const initialPlaceFormData: PlaceFormData = {
    fictionId: "",
    address: "",
    name: "",
    description: "",
    latitude: defaultCity?.lat ?? 48.8566,
    longitude: defaultCity?.lng ?? 2.3522,
    formattedAddress: "",
    cityId: defaultCity?.id ?? "",
    locationType: "",
    isLandmark: false,
  }

  const handleEditSubmit = async (placeId: string, data: PlaceFormData) => {
    setSubmitError(null)
    const result = await updatePlaceAction(placeId, {
      fictionId: data.fictionId,
      cityId: data.cityId,
      name: data.name,
      formattedAddress: data.formattedAddress || data.address,
      latitude: data.latitude,
      longitude: data.longitude,
      description: data.description,
      isLandmark: data.isLandmark,
      locationType: data.locationType || null,
    })
    if (!result.success) {
      setSubmitError(result.error)
      return
    }
    if (data.image) {
      const formData = new FormData()
      formData.set("file", data.image)
      await uploadPlaceImageAction(placeId, formData)
    }
    const list = await getAllPlacesAction()
    setLocations(list)
    setWorkflowStep("list")
    setEditingLocation(null)
  }

  const handleCreateSubmit = async (data: PlaceFormData) => {
    setSubmitError(null)
    const result = await createPlaceAction({
      fictionId: data.fictionId,
      cityId: data.cityId,
      name: data.name,
      formattedAddress: data.formattedAddress || data.address,
      latitude: data.latitude,
      longitude: data.longitude,
      description: data.description,
      isLandmark: data.isLandmark,
      locationType: data.locationType || null,
    })
    if (!result.success) {
      setSubmitError(result.error)
      return
    }
    if (data.image) {
      const formData = new FormData()
      formData.set("file", data.image)
      const uploadResult = await uploadPlaceImageAction(result.createdPlaceId, formData)
      if (!uploadResult.success) {
        setSubmitError(uploadResult.error ?? "Place created but image upload failed")
      }
    }
    // Refetch list so new place shows with image (or placeholder)
    setLocations(await getAllPlacesAction())
    setWorkflowStep("list")
  }

  const filteredLocations = locations.filter((loc) => {
    const matchesFiction = fictionFilter === "all" || loc.fictionId === fictionFilter
    if (!matchesFiction) return false
    if (!searchTerm.trim()) return true
    const q = searchTerm.toLowerCase()
    return (
      loc.name.toLowerCase().includes(q) ||
      (loc.description && loc.description.toLowerCase().includes(q)) ||
      (loc.address && loc.address.toLowerCase().includes(q))
    )
  })

  if (workflowStep === "create") {
    return (
      <PlaceCreateView
        fictions={fictions}
        cities={cities}
        initialFormData={initialPlaceFormData}
        onBack={() => setWorkflowStep("list")}
        onSubmit={handleCreateSubmit}
        submitError={submitError}
      />
    )
  }

  if (workflowStep === "edit" && editingLocation) {
    const editInitialFormData: PlaceFormData = {
      fictionId: editingLocation.fictionId,
      cityId: editingLocation.cityId,
      name: editingLocation.name,
      address: editingLocation.address ?? "",
      formattedAddress: editingLocation.address ?? "",
      description: editingLocation.description ?? "",
      latitude: editingLocation.lat,
      longitude: editingLocation.lng,
      locationType: editingLocation.locationType ?? "",
      isLandmark: editingLocation.isLandmark ?? false,
    }
    return (
      <PlaceCreateView
        fictions={fictions}
        cities={cities}
        initialFormData={editInitialFormData}
        placeId={editingLocation.id}
        initialImageUrl={
          editingLocation.image && !editingLocation.image.endsWith("/placeholder.svg")
            ? editingLocation.image
            : null
        }
        onBack={() => {
          setWorkflowStep("list")
          setEditingLocation(null)
          setSubmitError(null)
        }}
        onSubmit={(data) => handleEditSubmit(editingLocation.id, data)}
        submitError={submitError}
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Places ({filteredLocations.length})
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Add places to your stories. Pick an address on the map and create the place in one step.
            </p>
          </div>
          <Button onClick={() => setWorkflowStep("create")} variant="cta" className="gap-2">
            <Plus className="h-4 w-4" />
            Create Place
          </Button>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search places..."
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
                  <button
                    type="button"
                    onClick={() => {
                      setEditingLocation(loc)
                      setWorkflowStep("edit")
                      setSubmitError(null)
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-foreground/10 text-foreground hover:bg-foreground/20 transition-colors"
                  >
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
