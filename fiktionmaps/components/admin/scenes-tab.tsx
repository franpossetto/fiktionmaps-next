"use client"

import { useState, useEffect } from "react"
import { Plus, Edit2, Trash2, ChevronRight, Clapperboard, CheckCircle2, Search } from "lucide-react"
import type { Fiction } from "@/lib/modules/fictions"
import type { Location } from "@/lib/modules/locations"
import type { Scene } from "@/lib/modules/scenes"
import { useApi } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { FormField } from "./form-field"
import { DragDropZone } from "./drag-drop-zone"
import { WizardShell } from "./wizard-shell"

interface SceneFormData {
  title: string
  fictionId: string
  locationId: string
  timestamp: string
  chapter: number
  quote: string
  image?: File
}

type WorkflowStep = "list" | "select-fiction" | "select-location" | "details"

export function ScenesTab() {
  const { fictions: fictionsService, locations: locationsService, scenes: scenesService } = useApi()
  const [fictions, setFictions] = useState<Fiction[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [scenes, setScenes] = useState<Scene[]>([])
  const [workflowStep, setWorkflowStep] = useState<WorkflowStep>("list")
  const [searchTerm, setSearchTerm] = useState("")
  const [fictionFilter, setFictionFilter] = useState("all")
  const [formData, setFormData] = useState<SceneFormData>({
    title: "",
    fictionId: "",
    locationId: "",
    timestamp: "00:00:00",
    chapter: 1,
    quote: "",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const ctaClass =
    "gap-2 border border-cyan-500/30 bg-cyan-500/5 text-cyan-600 hover:bg-cyan-500/10"
  const wizardSteps = [
    { title: "Fiction", description: "Choose the story" },
    { title: "Location", description: "Select the place" },
    { title: "Details", description: "Describe the scene" },
  ]
  const stepIndex: Record<WorkflowStep, number> = {
    list: -1,
    "select-fiction": 0,
    "select-location": 1,
    details: 2,
  }

  useEffect(() => {
    Promise.all([
      fictionsService.getAll(),
      locationsService.getAll(),
      scenesService.getAll(),
    ]).then(([f, l, s]) => {
      setFictions(f)
      setLocations(l)
      setScenes(s)
    })
  }, [fictionsService, locationsService, scenesService])

  const resetFlowState = () => {
    setErrors({})
    setFormData({
      title: "",
      fictionId: "",
      locationId: "",
      timestamp: "00:00:00",
      chapter: 1,
      quote: "",
    })
  }

  const handleCancelWorkflow = () => {
    resetFlowState()
    setWorkflowStep("list")
  }

  const filteredScenes = scenes.filter((scene) => {
    const matchesFiction = fictionFilter === "all" || scene.fictionId === fictionFilter
    if (!matchesFiction) return false
    if (!searchTerm.trim()) return true
    const q = searchTerm.toLowerCase()
    const fiction = fictions.find((f) => f.id === scene.fictionId)
    const location = locations.find((l) => l.id === scene.locationId)
    return (
      scene.title.toLowerCase().includes(q) ||
      scene.description.toLowerCase().includes(q) ||
      scene.chapter?.toLowerCase().includes(q) ||
      scene.timestamp?.toLowerCase().includes(q) ||
      fiction?.title.toLowerCase().includes(q) ||
      location?.name.toLowerCase().includes(q)
    )
  })

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!formData.title.trim()) newErrors.title = "Scene title is required"
    if (!formData.fictionId) newErrors.fictionId = "Fiction is required"
    if (!formData.locationId) newErrors.locationId = "Location is required"
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validateForm()) {
      console.log("Submitting scene:", formData)
      resetFlowState()
      setWorkflowStep("list")
    }
  }

  const handleStartWorkflow = () => {
    resetFlowState()
    setWorkflowStep("select-fiction")
  }

  const handleSelectFiction = (fictionId: string) => {
    setFormData({ ...formData, fictionId, locationId: "" })
    setWorkflowStep("select-location")
  }

  const handleSelectLocation = (locationId: string) => {
    setFormData({ ...formData, locationId })
    setWorkflowStep("details")
  }

  // Step 1: List view
  if (workflowStep === "list") {
    return (
      <div className="space-y-6">
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Clapperboard className="h-5 w-5" />
                Scenes Library ({filteredScenes.length})
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Organize moments by location and timeline.
              </p>
            </div>
            <Button onClick={handleStartWorkflow} variant="outline" className={ctaClass}>
              <Plus className="h-4 w-4" />
              Create Scene
            </Button>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search scenes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>
            <select
              value={fictionFilter}
              onChange={(e) => setFictionFilter(e.target.value)}
              className="w-full sm:w-56 px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:border-cyan-500 transition-colors"
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
          {filteredScenes.map((scene) => {
            const fiction = fictions.find((f) => f.id === scene.fictionId)
            const location = locations.find((l) => l.id === scene.locationId)
            const timeLabel = scene.timestamp ? `Time ${scene.timestamp}` : scene.chapter || ""
            return (
              <div
                key={scene.id}
                className="group rounded-xl border border-border hover:border-cyan-500/30 hover:bg-card/50 transition-all overflow-hidden"
              >
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground truncate text-base">{scene.title}</h3>
                      <div className="flex items-center flex-wrap gap-2 mt-1">
                        <span className="text-xs font-medium uppercase px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                          {fiction?.title || "Fiction"}
                        </span>
                        {location?.name && (
                          <span className="text-xs text-muted-foreground">{location.name}</span>
                        )}
                        {timeLabel && (
                          <span className="text-xs text-muted-foreground">{timeLabel}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground line-clamp-2">{scene.description}</p>

                  <div className="flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity gap-2">
                    <button className="flex-1 flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors">
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
        title="Create Scene"
        subtitle="Pick the fiction and location, then describe the scene."
        steps={wizardSteps}
        currentStep={stepIndex["select-fiction"]}
        onBack={handleCancelWorkflow}
        backLabel="<- Back to Library"
        onCancel={handleCancelWorkflow}
        cancelLabel="Cancel"
      >
        <div className="space-y-6 w-full">
          <div>
            <h2 className="text-lg font-bold text-foreground mb-2">Step 1: Select Fiction</h2>
            <p className="text-sm text-muted-foreground">Choose which fiction this scene belongs to</p>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {fictions.map((fiction) => (
              <button
                key={fiction.id}
                onClick={() => handleSelectFiction(fiction.id)}
                className="w-full text-left p-4 rounded-lg border border-border hover:border-cyan-500/50 hover:bg-card/50 transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-foreground">{fiction.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{fiction.year}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-cyan-500 transition-colors flex-shrink-0" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </WizardShell>
    )
  }

  // Step 3: Select Location
  if (workflowStep === "select-location") {
    const selectedFiction = fictions.find((f) => f.id === formData.fictionId)
    const availableLocations = locations.filter((l) => l.fictionId === formData.fictionId)

    return (
      <WizardShell
        title="Create Scene"
        subtitle="Pick the fiction and location, then describe the scene."
        steps={wizardSteps}
        currentStep={stepIndex["select-location"]}
        onBack={handleCancelWorkflow}
        backLabel="<- Back to Library"
        onCancel={handleCancelWorkflow}
        cancelLabel="Cancel"
      >
        <div className="space-y-6 w-full">
          <div>
            <h2 className="text-lg font-bold text-foreground mb-2">Step 2: Select Location</h2>
            <p className="text-sm text-muted-foreground">
              For: <span className="font-semibold text-foreground">{selectedFiction?.title}</span>
            </p>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {availableLocations.length === 0 ? (
              <div className="p-4 rounded-lg border border-border/50 text-center">
                <p className="text-sm text-muted-foreground">No locations found for this fiction</p>
                <p className="text-xs text-muted-foreground mt-1">Add locations first in the Manage Locations section</p>
              </div>
            ) : (
              availableLocations.map((location) => (
                <button
                  key={location.id}
                  onClick={() => handleSelectLocation(location.id)}
                  className="w-full text-left p-4 rounded-lg border border-border hover:border-cyan-500/50 hover:bg-card/50 transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-foreground">{location.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">{location.description}</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-cyan-500 transition-colors flex-shrink-0" />
                  </div>
                </button>
              ))
            )}
          </div>

          <Button variant="outline" onClick={() => setWorkflowStep("select-fiction")} className="w-full">
            Back
          </Button>
        </div>
      </WizardShell>
    )
  }

  // Step 3: Scene Details
  if (workflowStep === "details") {
    const selectedFiction = fictions.find((f) => f.id === formData.fictionId)
    const selectedLocation = locations.find((l) => l.id === formData.locationId)

    return (
      <WizardShell
        title="Create Scene"
        subtitle="Pick the fiction and location, then describe the scene."
        steps={wizardSteps}
        currentStep={stepIndex.details}
        onBack={handleCancelWorkflow}
        backLabel="<- Back to Library"
        onCancel={handleCancelWorkflow}
        cancelLabel="Cancel"
      >
        <form onSubmit={handleSubmit} className="space-y-6 w-full">
        <div className="space-y-2">
          <h2 className="text-lg font-bold text-foreground mb-2">Step 3: Scene Details</h2>
          <p className="text-sm text-muted-foreground">Complete the information about this scene</p>
          <div className="flex flex-col gap-2 mt-4">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
              <CheckCircle2 className="h-4 w-4 text-cyan-600 flex-shrink-0" />
              <span className="text-xs font-medium text-cyan-600">Fiction: {selectedFiction?.title}</span>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
              <CheckCircle2 className="h-4 w-4 text-cyan-600 flex-shrink-0" />
              <span className="text-xs font-medium text-cyan-600">Location: {selectedLocation?.name}</span>
            </div>
          </div>
        </div>

        <FormField label="Scene Title" required error={errors.title}>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="e.g., Platform arrival"
            className="w-full px-4 py-2 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-all"
          />
        </FormField>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Timestamp (HH:MM:SS)">
            <input
              type="text"
              value={formData.timestamp}
              onChange={(e) => setFormData({ ...formData, timestamp: e.target.value })}
              placeholder="00:00:00"
              pattern="\d{2}:\d{2}:\d{2}"
              className="w-full px-4 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-all font-mono text-sm"
            />
          </FormField>

          <FormField label="Chapter/Episode">
            <input
              type="number"
              value={formData.chapter}
              onChange={(e) => setFormData({ ...formData, chapter: parseInt(e.target.value) })}
              min="1"
              className="w-full px-4 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-all"
            />
          </FormField>
        </div>

        <FormField label="Famous Quote">
          <textarea
            value={formData.quote}
            onChange={(e) => setFormData({ ...formData, quote: e.target.value })}
            placeholder="Optional memorable quote from this scene..."
            rows={3}
            className="w-full px-4 py-2 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-all resize-none"
          />
        </FormField>

        <FormField label="Scene Thumbnail">
          <DragDropZone
            onFilesSelected={() => {}}
            accept="image/*"
            maxSize={10 * 1024 * 1024}
            multiple={false}
            preview={true}
          />
        </FormField>

        <div className="flex gap-3 pt-4">
          <Button type="submit" className="flex-1 gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700">
            Create Scene
          </Button>
          <Button type="button" variant="outline" onClick={() => setWorkflowStep("select-location")}>
            Back
          </Button>
        </div>
        </form>
      </WizardShell>
    )
  }

  return null
}
