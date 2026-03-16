"use client"

import { useEffect, useState } from "react"
import { useRouter } from "@/i18n/navigation"
import { ArrowLeft, ArrowRight, Plus, MoreVertical, Edit2, Trash2, MapPin, Search, Loader2 } from "lucide-react"
import type { City } from "@/src/cities/city.domain"
import { Button } from "@/components/ui/button"
import { createCityAction, deleteCityAction } from "@/app/(app)/admin/actions"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { CityMapPicker } from "./city-map-picker"
import { MapProvider, MapContainer } from "@/lib/map"

interface CityFormData {
  name: string
  country: string
  lat: string
  lng: string
  zoom: string
}

type ViewMode = "cards" | "table"

interface CitiesTabProps {
  initialCities?: City[]
  onOpenCity?: (cityId: string) => void
  viewMode?: ViewMode
}

export function CitiesTab({ initialCities, onOpenCity, viewMode = "cards" }: CitiesTabProps) {
  const router = useRouter()
  const [cities, setCities] = useState<City[]>(initialCities ?? [])
  const [showWizard, setShowWizard] = useState(false)
  const [wizardStep, setWizardStep] = useState(0)
  const [searchTerm, setSearchTerm] = useState("")
  const [formData, setFormData] = useState<CityFormData>(() => ({
    name: "",
    country: "",
    lat: "48.8566",
    lng: "2.3522",
    zoom: "10",
  }))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [cityToDelete, setCityToDelete] = useState<City | null>(null)
  const [deleteConfirmName, setDeleteConfirmName] = useState("")
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    setCities(initialCities ?? [])
  }, [initialCities])

  const defaultCenter = { lat: 48.8566, lng: 2.3522 }
  const resetForm = () =>
    setFormData({
      name: "",
      country: "",
      lat: String(defaultCenter.lat),
      lng: String(defaultCenter.lng),
      zoom: "10",
    })

  const openWizard = () => {
    resetForm()
    setErrors({})
    setWizardStep(0)
    setShowWizard(true)
  }

  const closeWizard = () => {
    setShowWizard(false)
    setWizardStep(0)
    setErrors({})
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!formData.name.trim()) newErrors.name = "Name is required"
    if (!formData.country.trim()) newErrors.country = "Country is required"
    const lat = parseFloat(formData.lat)
    const lng = parseFloat(formData.lng)
    const zoom = parseInt(formData.zoom, 10)
    if (Number.isNaN(lat) || lat < -90 || lat > 90) newErrors.lat = "Latitude must be -90 to 90"
    if (Number.isNaN(lng) || lng < -180 || lng > 180) newErrors.lng = "Longitude must be -180 to 180"
    if (Number.isNaN(zoom) || zoom < 0 || zoom > 22) newErrors.zoom = "Zoom must be 0–22"
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const doCreate = async () => {
    setSubmitError(null)
    if (!validateForm()) return
    setSubmitting(true)
    const fd = new FormData()
    fd.set("name", formData.name.trim())
    fd.set("country", formData.country.trim())
    fd.set("lat", formData.lat)
    fd.set("lng", formData.lng)
    fd.set("zoom", formData.zoom)
    const result = await createCityAction(fd)
    setSubmitting(false)
    if (result.success) {
      closeWizard()
      resetForm()
      setCities((prev) => [...prev, result.city].sort((a, b) => a.name.localeCompare(b.name)))
      router.refresh()
      if (result.city.id && onOpenCity) onOpenCity(result.city.id)
    } else {
      setSubmitError(result.error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    doCreate()
  }

  const filteredCities = cities.filter(
    (city) =>
      city.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      city.country.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const openCity = (id: string) => {
    if (onOpenCity) onOpenCity(id)
    else router.push(`/admin/city/${id}`)
  }

  const openDeleteModal = (e: React.MouseEvent, city: City) => {
    e.stopPropagation()
    setCityToDelete(city)
    setDeleteConfirmName("")
  }

  const closeDeleteModal = () => {
    setCityToDelete(null)
    setDeleteConfirmName("")
  }

  const handleConfirmDelete = async () => {
    if (!cityToDelete || deleteConfirmName !== cityToDelete.name) return
    setDeleting(true)
    const result = await deleteCityAction(cityToDelete.id)
    setDeleting(false)
    if (result.success) {
      closeDeleteModal()
      setCities((prev) => prev.filter((c) => c.id !== cityToDelete.id))
      router.refresh()
    }
  }

  const deleteNameMatches = cityToDelete !== null && deleteConfirmName === cityToDelete.name

  if (showWizard) {
    const citySelected = !!formData.name
    return (
      <>
        <div className="fixed inset-0 bottom-[70px] md:bottom-0 md:left-[60px] z-[3000] bg-background flex flex-col overflow-y-auto">
          {/* Header */}
          <div className="px-4 sm:px-6 pt-6 pb-4 flex items-start justify-between gap-4">
            <div>
              <button
                type="button"
                onClick={wizardStep === 0 ? closeWizard : () => setWizardStep(0)}
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
              >
                <ArrowLeft className="h-4 w-4" />
                {wizardStep === 0 ? "Back to Cities" : "Back to map"}
              </button>
              <h2 className="text-2xl font-bold text-foreground">Create City</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {wizardStep === 0 ? "Search for a city and position it on the map." : "Review the details before saving."}
              </p>
            </div>
            <span className="mt-1 text-sm font-medium text-muted-foreground shrink-0">
              Step {wizardStep + 1} of 2
            </span>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col w-full flex-1 min-h-0">
            {/* Step 1 — map (keep mounted so state persists; hidden in step 2) */}
            <div className={wizardStep === 1 ? "hidden" : "flex flex-col w-full flex-1 min-h-0"}>
              <CityMapPicker
                mapKeySuffix="create"
                center={
                  formData.lat && formData.lng
                    ? { lat: parseFloat(formData.lat), lng: parseFloat(formData.lng) }
                    : defaultCenter
                }
                zoom={formData.zoom ? parseInt(formData.zoom, 10) : 10}
                onCenterChange={(lat, lng) =>
                  setFormData((prev) => ({ ...prev, lat: String(lat), lng: String(lng) }))
                }
                onZoomChange={(zoom) => setFormData((prev) => ({ ...prev, zoom: String(zoom) }))}
                onCitySelect={(_, __, name, country) =>
                  setFormData((prev) => ({ ...prev, name, country }))
                }
                onClear={() => setFormData((prev) => ({ ...prev, name: "", country: "" }))}
                cityName={formData.name}
                cityCountry={formData.country}
                introMode
                showSearch
                onError={(msg) => setErrors((prev) => ({ ...prev, map: msg }))}
              />
            </div>

            {/* Step 2 — summary */}
            {wizardStep === 1 && (
              <div className="flex flex-col flex-1 items-center px-4 sm:px-6 py-8 pb-28">
                <div className="w-full max-w-2xl space-y-6">
                  {/* Map preview */}
                  <div className="w-full h-80 rounded-2xl overflow-hidden border border-border">
                    <MapProvider libraries={[]}>
                      <MapContainer
                        id="city-summary-map"
                        mapKey="city-summary-preview"
                        defaultCenter={{ lat: parseFloat(formData.lat), lng: parseFloat(formData.lng) }}
                        defaultZoom={parseInt(formData.zoom, 10)}
                        className="h-full w-full"
                        interactive={false}
                        controls={{ zoom: false }}
                      />
                    </MapProvider>
                  </div>

                  {/* City name & country */}
                  <div className="text-center space-y-1">
                    <p className="text-3xl font-black tracking-tight text-foreground">{formData.name}</p>
                    <p className="text-base text-muted-foreground">{formData.country}</p>
                  </div>

                  {/* Coordinates table */}
                  <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-4 bg-card">
                      <span className="text-sm text-muted-foreground">Latitude</span>
                      <span className="font-mono text-sm text-foreground">{parseFloat(formData.lat).toFixed(5)}</span>
                    </div>
                    <div className="flex items-center justify-between px-6 py-4 bg-card">
                      <span className="text-sm text-muted-foreground">Longitude</span>
                      <span className="font-mono text-sm text-foreground">{parseFloat(formData.lng).toFixed(5)}</span>
                    </div>
                    <div className="flex items-center justify-between px-6 py-4 bg-card">
                      <span className="text-sm text-muted-foreground">Zoom</span>
                      <span className="font-mono text-sm text-foreground">{formData.zoom}</span>
                    </div>
                  </div>

                  {submitError && (
                    <p className="text-sm text-red-500 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2">
                      {submitError}
                    </p>
                  )}
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Fixed bottom bar — step 1 */}
        {wizardStep === 0 && (
          <div className="fixed bottom-[70px] left-0 right-0 md:bottom-0 md:left-[60px] z-[3001] border-t border-border bg-background px-4 sm:px-6 py-4">
            <div className="flex items-center justify-between gap-4">
              <Button type="button" variant="outline" onClick={closeWizard} className="rounded-xl px-6">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button
                type="button"
                variant="cta"
                disabled={!citySelected}
                onClick={() => setWizardStep(1)}
                className="rounded-xl gap-2 px-6"
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Fixed bottom bar — step 2 submit */}
        {wizardStep === 1 && (
          <div className="fixed bottom-[70px] left-0 right-0 md:bottom-0 md:left-[60px] z-[3001] border-t border-border bg-background px-4 sm:px-6 py-4">
            <div className="flex items-center justify-between gap-4">
              <Button type="button" variant="outline" onClick={() => setWizardStep(0)} className="rounded-xl px-6 shrink-0">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <div className="min-w-0 text-center">
                <p className="text-sm font-semibold text-foreground truncate">{formData.name}</p>
                <p className="text-xs text-muted-foreground truncate">{formData.country}</p>
              </div>
              <Button
                type="button"
                variant="cta"
                className="gap-2 rounded-xl px-6 shrink-0"
                disabled={submitting}
                onClick={doCreate}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating…
                  </>
                ) : (
                  "Create City"
                )}
              </Button>
            </div>
          </div>
        )}
      </>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Cities ({filteredCities.length})
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Manage cities for map views and locations.
            </p>
          </div>
          <Button onClick={openWizard} variant="cta" className="gap-2">
            <Plus className="h-4 w-4" />
            Create City
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search cities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground transition-colors"
            />
          </div>
        </div>
      </div>

      {viewMode === "cards" ? (
        <div className="max-w-6xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCities.map((city) => (
              <div
                key={city.id}
                role="button"
                tabIndex={0}
                onClick={() => openCity(city.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    openCity(city.id)
                  }
                }}
                className="group rounded-xl border border-border hover:border-foreground/30 hover:bg-card/50 transition-all overflow-hidden"
              >
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground truncate text-base">{city.name}</h3>
                      <p className="text-xs text-muted-foreground mt-1">{city.country}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {city.lat.toFixed(4)}, {city.lng.toFixed(4)} · zoom {city.zoom}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          onClick={(e) => e.stopPropagation()}
                          className="p-2 rounded-lg text-muted-foreground hover:bg-foreground/10 hover:text-foreground transition-colors"
                          aria-label="Actions"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation()
                            openCity(city.id)
                          }}
                        >
                          <Edit2 className="h-3 w-3" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => openDeleteModal(e as React.MouseEvent, city)}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="h-3 w-3" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="w-full overflow-x-auto rounded-xl border border-border">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-xs font-semibold uppercase text-muted-foreground py-3 px-4 text-left">Name</th>
                <th className="text-xs font-semibold uppercase text-muted-foreground py-3 px-4 text-left">Country</th>
                <th className="text-xs font-semibold uppercase text-muted-foreground py-3 px-4 text-left">Lat</th>
                <th className="text-xs font-semibold uppercase text-muted-foreground py-3 px-4 text-left">Lng</th>
                <th className="text-xs font-semibold uppercase text-muted-foreground py-3 px-4 text-left">Zoom</th>
                <th className="text-xs font-semibold uppercase text-muted-foreground py-3 px-4 text-left w-20">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCities.map((city) => (
                <tr
                  key={city.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => openCity(city.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      openCity(city.id)
                    }
                  }}
                  className="border-b border-border hover:bg-card/50 transition-colors last:border-b-0"
                >
                  <td className="py-3 px-4 text-left font-medium text-foreground">{city.name}</td>
                  <td className="py-3 px-4 text-left text-sm text-muted-foreground">{city.country}</td>
                  <td className="py-3 px-4 text-left text-sm text-muted-foreground">{city.lat.toFixed(4)}</td>
                  <td className="py-3 px-4 text-left text-sm text-muted-foreground">{city.lng.toFixed(4)}</td>
                  <td className="py-3 px-4 text-left text-sm text-muted-foreground">{city.zoom}</td>
                  <td className="py-3 px-4 text-left" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="p-2 rounded-lg text-muted-foreground hover:bg-foreground/10 hover:text-foreground transition-colors"
                          aria-label="Actions"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openCity(city.id)}>
                          <Edit2 className="h-3 w-3" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => openDeleteModal(e as React.MouseEvent, city)}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="h-3 w-3" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AlertDialog open={cityToDelete !== null} onOpenChange={(open) => { if (!open) closeDeleteModal() }}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete city</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. To confirm, type the exact name of the city to delete.
              {cityToDelete && (
                <span className="mt-2 block font-semibold text-foreground">«{cityToDelete.name}»</span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <input
              type="text"
              value={deleteConfirmName}
              onChange={(e) => setDeleteConfirmName(e.target.value)}
              placeholder="Exact name of the city"
              className="w-full px-4 py-2 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground/20"
              autoFocus
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={closeDeleteModal}>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={!deleteNameMatches || deleting}
              onClick={handleConfirmDelete}
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deleting…
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
