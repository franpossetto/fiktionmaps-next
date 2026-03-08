"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Edit2, Trash2, Book, Search } from "lucide-react"
import type { Fiction } from "@/lib/modules/fictions"
import { useApi } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { FormField } from "./form-field"
import { CoverCropper, type CoverCrop } from "./cover-cropper"
import { WizardShell } from "./wizard-shell"
import { FICTION_GENRES } from "@/lib/constants/fiction-genres"

interface FictionFormData {
  title: string
  year: number
  genre: string
  synopsis: string
  coverImage?: File
  /** Optional banner image URL (wide hero). */
  bannerImage: string
}

interface FictionsTabProps {
  onOpenFiction?: (fictionId: string) => void
}

export function FictionsTab({ onOpenFiction }: FictionsTabProps) {
  const router = useRouter()
  const { fictions: fictionsService } = useApi()
  const [fictions, setFictions] = useState<Fiction[]>([])
  const [showWizard, setShowWizard] = useState(false)
  const [wizardStep, setWizardStep] = useState(0)
  const [searchTerm, setSearchTerm] = useState("")
  const [formData, setFormData] = useState<FictionFormData>({
    title: "",
    year: new Date().getFullYear(),
    genre: "",
    synopsis: "",
    coverImage: undefined,
    bannerImage: "",
  })
  const [coverCrop, setCoverCrop] = useState<CoverCrop>({ x: 0, y: 0, scale: 1 })
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    fictionsService.getAll().then(setFictions)
  }, [fictionsService])

  const resetForm = () => {
    setFormData({
      title: "",
      year: new Date().getFullYear(),
      genre: "",
      synopsis: "",
      coverImage: undefined,
      bannerImage: "",
    })
    setCoverCrop({ x: 0, y: 0, scale: 1 })
  }

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

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {}
    if (step === 0 && !formData.coverImage) newErrors.coverImage = "Cover image is required"
    if (step === 1) {
      if (!formData.title.trim()) newErrors.title = "Title is required"
      if (formData.year < 1900 || formData.year > new Date().getFullYear())
        newErrors.year = "Invalid year"
      if (!formData.genre) newErrors.genre = "Genre is required"
      if (!formData.synopsis.trim()) newErrors.synopsis = "Description is required"
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!formData.title.trim()) newErrors.title = "Title is required"
    if (!formData.genre) newErrors.genre = "Genre is required"
    if (!formData.synopsis.trim()) newErrors.synopsis = "Description is required"
    if (formData.year < 1900 || formData.year > new Date().getFullYear())
      newErrors.year = "Invalid year"
    if (!formData.coverImage) newErrors.coverImage = "Cover image is required"
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validateForm()) {
      console.log("Submitting fiction:", formData)
      closeWizard()
      resetForm()
    }
  }

  useEffect(() => {
    if (!formData.coverImage) {
      setCoverPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(formData.coverImage)
    setCoverPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [formData.coverImage])

  const filteredFictions = fictions.filter((fiction) =>
    fiction.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    fiction.type.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const openFiction = (id: string) => {
    if (onOpenFiction) onOpenFiction(id)
    else router.push(`/admin/fiction/${id}`)
  }

  const steps = [
    { title: "Cover", description: "Upload and crop the poster" },
    { title: "Details", description: "Title, year, and synopsis" },
  ]
  const ctaClass =
    "gap-2 border border-cyan-500/30 bg-cyan-500/5 text-cyan-600 hover:bg-cyan-500/10"

  if (showWizard) {
    return (
      <WizardShell
        title="Create Fiction"
        subtitle="Upload a cover and add the details in a two-step flow."
        steps={steps}
        currentStep={wizardStep}
        onBack={closeWizard}
        backLabel="<- Back to Library"
        onCancel={closeWizard}
        cancelLabel="Cancel"
      >
        <form onSubmit={handleSubmit} className="space-y-6 w-full">
          {wizardStep === 0 && (
            <div className="space-y-4">
              <FormField
                label="Cover image"
                required
                error={errors.coverImage}
                hint="Recommended size: 1200×1800px. You can reposition after upload."
              >
                <CoverCropper
                  previewUrl={coverPreviewUrl}
                  crop={coverCrop}
                  onFileChange={(file) => {
                    setFormData((prev) => ({ ...prev, coverImage: file }))
                    setCoverCrop({ x: 0, y: 0, scale: 1 })
                  }}
                  onCropChange={setCoverCrop}
                  aspect={2 / 3}
                />
              </FormField>
            </div>
          )}

          {wizardStep === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Title" required error={errors.title}>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Midnight in Paris"
                    className="w-full px-4 py-2 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-all"
                  />
                </FormField>

                <FormField label="Year" required error={errors.year}>
                  <input
                    type="number"
                    value={formData.year}
                    onChange={(e) =>
                      setFormData({ ...formData, year: parseInt(e.target.value) })
                    }
                    min="1900"
                    max={new Date().getFullYear()}
                    className="w-full px-4 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-all"
                  />
                </FormField>

                <FormField label="Genre" required error={errors.genre}>
                  <select
                    value={formData.genre}
                    onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-all"
                  >
                    <option value="">Select genre</option>
                    {FICTION_GENRES.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </FormField>
              </div>

              <FormField label="Description" required error={errors.synopsis}>
                <textarea
                  value={formData.synopsis}
                  onChange={(e) => setFormData({ ...formData, synopsis: e.target.value })}
                  placeholder="Short description of the fiction..."
                  rows={4}
                  className="w-full px-4 py-2 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-all resize-none"
                />
              </FormField>

              <FormField label="Banner image (optional)" hint="Wide hero URL for the fiction detail page.">
                <input
                  type="url"
                  value={formData.bannerImage}
                  onChange={(e) => setFormData({ ...formData, bannerImage: e.target.value })}
                  placeholder="https://… or /banners/…"
                  className="w-full px-4 py-2 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-all"
                />
              </FormField>

              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Summary</p>
                <div className="mt-3 flex items-center gap-3">
                  <div className="h-12 w-9 rounded-md border border-border bg-background/80 flex items-center justify-center text-[10px] text-muted-foreground overflow-hidden">
                    {coverPreviewUrl ? (
                      <img src={coverPreviewUrl} alt="Cover preview" className="h-full w-full object-cover" />
                    ) : (
                      "No cover"
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {formData.title || "Untitled fiction"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formData.year || "Year"}
                      {formData.genre ? ` · ${formData.genre}` : ""}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            {wizardStep > 0 && (
              <Button type="button" variant="outline" onClick={() => setWizardStep((s) => s - 1)}>
                Back
              </Button>
            )}
            {wizardStep < steps.length - 1 ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (validateStep(wizardStep)) {
                    setWizardStep((s) => s + 1)
                  }
                }}
                className={ctaClass}
              >
                Next
              </Button>
            ) : (
              <Button type="submit" variant="outline" className={ctaClass}>
                Create Fiction
              </Button>
            )}
          </div>
        </form>
      </WizardShell>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with search and add button */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Book className="h-5 w-5" />
              Fictions Library ({filteredFictions.length})
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Curate stories with a clean, lightweight creation flow.
            </p>
          </div>
          <Button onClick={openWizard} variant="outline" className={ctaClass}>
            <Plus className="h-4 w-4" />
            Create Fiction
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search fictions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>
      </div>

      {/* Fictions grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredFictions.map((fiction) => (
          <div
            key={fiction.id}
            role="button"
            tabIndex={0}
            onClick={() => openFiction(fiction.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                openFiction(fiction.id)
              }
            }}
            className="group rounded-xl border border-border hover:border-cyan-500/30 hover:bg-card/50 transition-all overflow-hidden"
          >
            {/* Fiction card */}
            <div className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground truncate text-base">{fiction.title}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-medium uppercase px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                      {fiction.type}
                    </span>
                    <span className="text-xs text-muted-foreground">{fiction.year}</span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-muted-foreground line-clamp-2">{fiction.synopsis}</p>

              <div className="flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    openFiction(fiction.id)
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
                >
                  <Edit2 className="h-3 w-3" />
                  Edit
                </button>
                <button
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                >
                  <Trash2 className="h-3 w-3" />
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

    </div>
  )
}
