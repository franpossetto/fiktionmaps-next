"use client"

import { useState, useEffect, useCallback } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "@/i18n/navigation"
import { Plus, Edit2, Trash2, ChevronRight, Clapperboard, CheckCircle2, Search, Loader2 } from "lucide-react"
import type { FictionWithMedia } from "@/src/fictions/fiction.domain"
import type { Location } from "@/src/locations"
import type { Scene } from "@/src/scenes"
import { createClient } from "@/lib/supabase/client"
import { ASSET_VIDEOS_BUCKET } from "@/lib/asset-videos/asset-videos-bucket"
import { buildTimecodeLabel, type TimecodeParts } from "@/lib/scenes/scene-timecode"
import { Button } from "@/components/ui/button"
import { FormField } from "./form-field"
import { DragDropZone } from "./drag-drop-zone"
import { SceneTimecodeInput } from "./scene-timecode-input"
import { WizardShell } from "./wizard-shell"

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_")
}

async function uploadSceneVideoToBucket(file: File): Promise<string> {
  const supabase = createClient()
  const path = `scenes/${crypto.randomUUID()}/${sanitizeFileName(file.name)}`
  const { error } = await supabase.storage.from(ASSET_VIDEOS_BUCKET).upload(path, file, {
    contentType: file.type || "video/mp4",
    upsert: false,
  })
  if (error) throw new Error(error.message)
  const { data } = supabase.storage.from(ASSET_VIDEOS_BUCKET).getPublicUrl(path)
  return data.publicUrl
}

interface SceneFormData {
  title: string
  description: string
  fictionId: string
  placeId: string
  timecode: TimecodeParts
  quote: string
  season: string
  episode: string
  episodeTitle: string
  videoFile: File | null
}

const emptyForm = (): SceneFormData => ({
  title: "",
  description: "",
  fictionId: "",
  placeId: "",
  timecode: { h: "", m: "", s: "" },
  quote: "",
  season: "",
  episode: "",
  episodeTitle: "",
  videoFile: null,
})

type WorkflowStep = "list" | "select-fiction" | "select-location" | "details"

export function ScenesTab() {
  const t = useTranslations("Scenes")
  const router = useRouter()
  const [fictions, setFictions] = useState<FictionWithMedia[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [scenes, setScenes] = useState<Scene[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [workflowStep, setWorkflowStep] = useState<WorkflowStep>("list")
  const [searchTerm, setSearchTerm] = useState("")
  const [fictionFilter, setFictionFilter] = useState("all")
  const [formData, setFormData] = useState<SceneFormData>(emptyForm)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const loadScenes = useCallback(async () => {
    const res = await fetch("/api/scenes")
    if (!res.ok) {
      setError("Failed to load scenes")
      return
    }
    const data = (await res.json()) as Scene[]
    setScenes(data)
    setError(null)
  }, [])

  useEffect(() => {
    // Use admin APIs (real UUIDs from DB), not useApi mocks — POST /api/scenes validates UUIDs.
    Promise.all([
      fetch("/api/admin/fictions").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/admin/places").then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([f, l]) => {
        setFictions((f ?? []) as FictionWithMedia[])
        setLocations((l ?? []) as Location[])
      })
      .catch(() => setError("Failed to load fictions or locations"))
    loadScenes().finally(() => setLoading(false))
  }, [loadScenes])

  const audiovisualFictions = fictions.filter((f) => f.type === "movie" || f.type === "tv-series")

  const resetFlowState = () => {
    setErrors({})
    setFormData(emptyForm())
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
    const location = locations.find((l) => l.id === scene.placeId)
    return (
      scene.title.toLowerCase().includes(q) ||
      scene.description.toLowerCase().includes(q) ||
      scene.timestamp?.toLowerCase().includes(q) ||
      scene.episodeTitle?.toLowerCase().includes(q) ||
      fiction?.title.toLowerCase().includes(q) ||
      location?.name.toLowerCase().includes(q)
    )
  })

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!formData.title.trim()) newErrors.title = "Scene title is required"
    if (!formData.description.trim()) newErrors.description = "Description is required"
    if (!formData.fictionId) newErrors.fictionId = "Fiction is required"
    if (!formData.placeId) newErrors.placeId = "Place is required"
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return
    setSaving(true)
    setError(null)
    try {
      let videoUrl: string | null = null
      if (formData.videoFile) {
        videoUrl = await uploadSceneVideoToBucket(formData.videoFile)
      }

      const fiction = fictions.find((f) => f.id === formData.fictionId)
      const isTv = fiction?.type === "tv-series"

      const season = formData.season.trim() ? parseInt(formData.season, 10) : null
      const episode = formData.episode.trim() ? parseInt(formData.episode, 10) : null
      if (isTv && season != null && (season <= 0 || !Number.isFinite(season))) {
        setErrors({ season: "Invalid season" })
        setSaving(false)
        return
      }
      if (isTv && episode != null && (episode <= 0 || !Number.isFinite(episode))) {
        setErrors({ episode: "Invalid episode" })
        setSaving(false)
        return
      }

      const timestampLabel = buildTimecodeLabel(formData.timecode)

      const basePayload = {
        fictionId: formData.fictionId,
        placeId: formData.placeId,
        title: formData.title.trim(),
        description: formData.description.trim(),
        quote: formData.quote.trim() || null,
        timestampLabel,
        season: isTv ? season : null,
        episode: isTv ? episode : null,
        episodeTitle: isTv && formData.episodeTitle.trim() ? formData.episodeTitle.trim() : null,
      }

      const res = await fetch("/api/scenes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...basePayload,
          videoUrl,
          sortOrder: 0,
          active: true,
        }),
      })

      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(j.error || "Failed to create scene")
      }

      await loadScenes()
      resetFlowState()
      setWorkflowStep("list")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save scene")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (scene: Scene) => {
    if (!window.confirm(t("deleteConfirm", { title: scene.title }))) return
    setError(null)
    const res = await fetch(`/api/scenes/${scene.id}`, { method: "DELETE" })
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string }
      setError(j.error || "Failed to delete scene")
      return
    }
    await loadScenes()
  }

  const handleStartWorkflow = () => {
    resetFlowState()
    setWorkflowStep("select-fiction")
  }

  const handleSelectFiction = (fictionId: string) => {
    setFormData({ ...emptyForm(), fictionId })
    setWorkflowStep("select-location")
  }

  const handleSelectLocation = (placeId: string) => {
    setFormData((prev) => ({ ...prev, placeId }))
    setWorkflowStep("details")
  }

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

  if (workflowStep === "list") {
    return (
      <div className="space-y-6">
        {error && (
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-200">{error}</div>
        )}
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Clapperboard className="h-5 w-5" />
                {t("libraryTitle")} ({loading ? "…" : filteredScenes.length})
              </h2>
              <p className="text-xs text-muted-foreground mt-1">{t("librarySubtitle")}</p>
            </div>
            <Button onClick={handleStartWorkflow} variant="cta" className="gap-2" disabled={loading}>
              <Plus className="h-4 w-4" />
              {t("createScene")}
            </Button>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder={t("searchPlaceholder")}
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
              <option value="all">{t("allFictions")}</option>
              {fictions.map((fiction) => (
                <option key={fiction.id} value={fiction.id}>
                  {fiction.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            {t("loadingScenes")}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredScenes.map((scene) => {
              const fiction = fictions.find((f) => f.id === scene.fictionId)
              const location = locations.find((l) => l.id === scene.placeId)
              const timeLabel =
                scene.timestamp ||
                (scene.season != null && scene.episode != null
                  ? `S${scene.season}E${scene.episode}`
                  : "")
              return (
                <div
                  key={scene.id}
                  className="group rounded-xl border border-border hover:border-foreground/30 hover:bg-card/50 transition-all overflow-hidden"
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
                      <button
                        type="button"
                        onClick={() => router.push(`/admin/scene/${scene.id}`)}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-foreground/10 text-foreground hover:bg-foreground/20 transition-colors"
                      >
                        <Edit2 className="h-3 w-3" />
                        {t("editScene")}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(scene)}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                      >
                        <Trash2 className="h-3 w-3" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  if (workflowStep === "select-fiction") {
    return (
      <WizardShell
        title="Create Scene"
        subtitle="Pick the fiction and place, then describe the scene."
        steps={wizardSteps}
        currentStep={stepIndex["select-fiction"]}
        onBack={handleCancelWorkflow}
        backLabel="<- Back to Library"
        onCancel={handleCancelWorkflow}
        cancelLabel="Cancel"
      >
        <div className="space-y-6 w-full">
          <div>
            <h2 className="text-lg font-bold text-foreground mb-2">{t("stepFiction")}</h2>
            <p className="text-sm text-muted-foreground">{t("moviesTvOnly")}</p>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {audiovisualFictions.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("noAudiovisualFictions")}</p>
            ) : (
              audiovisualFictions.map((fiction) => (
                <button
                  key={fiction.id}
                  type="button"
                  onClick={() => handleSelectFiction(fiction.id)}
                  className="w-full text-left p-4 rounded-lg border border-border hover:border-foreground/50 hover:bg-card/50 transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-foreground">{fiction.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {fiction.year} · {fiction.type}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </WizardShell>
    )
  }

  if (workflowStep === "select-location") {
    const selectedFiction = fictions.find((f) => f.id === formData.fictionId)
    const availableLocations = locations.filter((l) => l.fictionId === formData.fictionId)

    return (
      <WizardShell
        title="Create Scene"
        subtitle="Pick the fiction and place, then describe the scene."
        steps={wizardSteps}
        currentStep={stepIndex["select-location"]}
        onBack={handleCancelWorkflow}
        backLabel="<- Back to Library"
        onCancel={handleCancelWorkflow}
        cancelLabel="Cancel"
      >
        <div className="space-y-6 w-full">
          <div>
            <h2 className="text-lg font-bold text-foreground mb-2">{t("stepPlace")}</h2>
            <p className="text-sm text-muted-foreground">
              For: <span className="font-semibold text-foreground">{selectedFiction?.title}</span>
            </p>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {availableLocations.length === 0 ? (
              <div className="p-4 rounded-lg border border-border/50 text-center">
                <p className="text-sm text-muted-foreground">{t("noPlaces")}</p>
                <p className="text-xs text-muted-foreground mt-1">{t("addPlacesFirst")}</p>
              </div>
            ) : (
              availableLocations.map((location) => (
                <button
                  key={location.id}
                  type="button"
                  onClick={() => handleSelectLocation(location.id)}
                  className="w-full text-left p-4 rounded-lg border border-border hover:border-foreground/50 hover:bg-card/50 transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-foreground">{location.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">{location.description}</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
                  </div>
                </button>
              ))
            )}
          </div>

          <Button variant="outline" onClick={() => setWorkflowStep("select-fiction")} className="w-full">
            {t("back")}
          </Button>
        </div>
      </WizardShell>
    )
  }

  if (workflowStep === "details") {
    const selectedFiction = fictions.find((f) => f.id === formData.fictionId)
    const selectedLocation = locations.find((l) => l.id === formData.placeId)
    const isTv = selectedFiction?.type === "tv-series"

    return (
      <WizardShell
        title={t("createScene")}
        subtitle={t("wizardSubtitle")}
        steps={wizardSteps}
        currentStep={stepIndex.details}
        onBack={handleCancelWorkflow}
        backLabel="<- Back to Library"
        onCancel={handleCancelWorkflow}
        cancelLabel="Cancel"
      >
        <form onSubmit={handleSubmit} className="space-y-6 w-full">
          {error && (
            <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-200">{error}</div>
          )}
          <div className="space-y-2">
            <h2 className="text-lg font-bold text-foreground mb-2">{t("stepDetails")}</h2>
            <p className="text-sm text-muted-foreground">{t("stepDetailsHint")}</p>
            <div className="flex flex-col gap-2 mt-4">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-foreground/10 border border-foreground/30">
                <CheckCircle2 className="h-4 w-4 text-foreground flex-shrink-0" />
                <span className="text-xs font-medium text-foreground">Fiction: {selectedFiction?.title}</span>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-foreground/10 border border-foreground/30">
                <CheckCircle2 className="h-4 w-4 text-foreground flex-shrink-0" />
                <span className="text-xs font-medium text-foreground">Place: {selectedLocation?.name}</span>
              </div>
            </div>
          </div>

          <FormField label={t("sceneTitle")} required error={errors.title}>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Rooftop chase"
              className="w-full px-4 py-2 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground/20 transition-all"
            />
          </FormField>

          <FormField label={t("description")} required error={errors.description}>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="What happens in this clip?"
              rows={3}
              className="w-full px-4 py-2 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground/20 transition-all resize-none"
            />
          </FormField>

          <FormField label={t("timestampOptional")}>
            <SceneTimecodeInput
              value={formData.timecode}
              onChange={(timecode) => setFormData({ ...formData, timecode })}
              labels={{
                hours: t("timecodeHours"),
                minutes: t("timecodeMinutes"),
                seconds: t("timecodeSeconds"),
              }}
            />
          </FormField>

          {isTv && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField label={t("season")} error={errors.season}>
                <input
                  type="number"
                  min={1}
                  value={formData.season}
                  onChange={(e) => setFormData({ ...formData, season: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-border bg-card text-foreground"
                />
              </FormField>
              <FormField label={t("episode")} error={errors.episode}>
                <input
                  type="number"
                  min={1}
                  value={formData.episode}
                  onChange={(e) => setFormData({ ...formData, episode: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-border bg-card text-foreground"
                />
              </FormField>
              <FormField label={t("episodeTitle")}>
                <input
                  type="text"
                  value={formData.episodeTitle}
                  onChange={(e) => setFormData({ ...formData, episodeTitle: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-border bg-card text-foreground"
                />
              </FormField>
            </div>
          )}

          <FormField label={t("quoteOptional")}>
            <textarea
              value={formData.quote}
              onChange={(e) => setFormData({ ...formData, quote: e.target.value })}
              placeholder="Memorable line…"
              rows={2}
              className="w-full px-4 py-2 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground/20 transition-all resize-none"
            />
          </FormField>

          <FormField label={t("videoUpload")}>
            <DragDropZone
              onFilesSelected={(files) => {
                const f = files[0]
                setFormData((prev) => ({ ...prev, videoFile: f ?? null }))
              }}
              accept="video/mp4,video/webm,video/quicktime"
              maxSize={100 * 1024 * 1024}
              multiple={false}
              preview={false}
            />
            {formData.videoFile && (
              <p className="text-xs text-muted-foreground mt-1">
                {t("selectedFile", { name: formData.videoFile.name })}
              </p>
            )}
          </FormField>

          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              disabled={saving}
              className="flex-1 gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {t("createScene")}
            </Button>
            <Button type="button" variant="outline" onClick={() => setWorkflowStep("select-location")}>
              {t("back")}
            </Button>
          </div>
        </form>
      </WizardShell>
    )
  }

  return null
}
