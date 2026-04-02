"use client"

import { useEffect, useState } from "react"
import { Plus, Edit2, Trash2, Search, MapPin } from "lucide-react"
import type { City } from "@/src/cities/city.domain"
import type { Fiction } from "@/src/fictions/fiction.domain"
import type { Location } from "@/src/locations"
import { Button } from "@/components/ui/button"
import { PlaceCreateView, type PlaceFormData } from "./place-create-view"
import { uploadPlaceImageAction } from "@/lib/actions/places/place.actions"

type WorkflowStep = "list" | "create" | "edit"

interface LocationsTabProps {
  initialLocations?: Location[]
}

export function LocationsTab({ initialLocations }: LocationsTabProps) {
  const [cities, setCities] = useState<City[]>([])
  const [fictions, setFictions] = useState<Fiction[]>([])
  const [locations, setLocations] = useState<Location[]>(initialLocations ?? [])
  const [workflowStep, setWorkflowStep] = useState<WorkflowStep>("list")
  const [editingLocation, setEditingLocation] = useState<Location | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [fictionFilter, setFictionFilter] = useState("all")
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    setLocations(initialLocations ?? [])
  }, [initialLocations])

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/cities").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/admin/fictions").then((r) => (r.ok ? r.json() : [])),
    ]).then(([c, f]) => {
      setCities((c ?? []) as City[])
      setFictions((f ?? []) as Fiction[])
    })
  }, [])

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
    const res = await fetch(`/api/admin/places/${placeId}`, {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        fictionId: data.fictionId,
        cityId: data.cityId,
        name: data.name,
        formattedAddress: data.formattedAddress || data.address,
        latitude: data.latitude,
        longitude: data.longitude,
        description: data.description,
        isLandmark: data.isLandmark,
        locationType: data.locationType || null,
      }),
    })
    let json: { error?: string }
    try {
      json = await res.json()
    } catch {
      setSubmitError(res.ok ? "Invalid response" : "Failed to update place")
      return
    }
    if (!res.ok) {
      setSubmitError(json?.error ?? "Failed to update place")
      return
    }
    if (data.image) {
      const formData = new FormData()
      formData.set("file", data.image)
      await uploadPlaceImageAction(placeId, formData)
    }
    const listRes = await fetch("/api/admin/places")
    if (listRes.ok) {
      const list = await listRes.json()
      setLocations((list ?? []) as Location[])
    }
    setWorkflowStep("list")
    setEditingLocation(null)
  }

  const handleCreateSubmit = async (data: PlaceFormData) => {
    setSubmitError(null)
    const res = await fetch("/api/admin/places", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        fictionId: data.fictionId,
        cityId: data.cityId,
        name: data.name,
        formattedAddress: data.formattedAddress || data.address,
        latitude: data.latitude,
        longitude: data.longitude,
        description: data.description,
        isLandmark: data.isLandmark,
        locationType: data.locationType || null,
      }),
    })
    let json: { error?: string; locations?: Location[] }
    try {
      json = await res.json()
    } catch {
      setSubmitError(res.ok ? "Invalid response" : "Failed to create place")
      return
    }
    if (!res.ok) {
      setSubmitError(json?.error ?? "Failed to create place")
      return
    }
    const createdPlaceId = (json as { createdPlaceId?: string }).createdPlaceId
    if (data.image && createdPlaceId) {
      const formData = new FormData()
      formData.set("file", data.image)
      const uploadResult = await uploadPlaceImageAction(createdPlaceId, formData)
      if (!uploadResult.success) {
        setSubmitError(uploadResult.error ?? "Place created but image upload failed")
      }
    }
    // Refetch list so new place shows with image (or placeholder)
    const listRes = await fetch("/api/admin/places")
    if (listRes.ok) {
      const list = await listRes.json()
      setLocations((list ?? []) as Location[])
    } else if (json.locations) {
      setLocations(json.locations as Location[])
    }
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
