"use client"

import { useEffect, useState, useRef } from "react"
import Image from "next/image"
import { useRouter } from "@/i18n/navigation"
import { Plus, MoreVertical, Edit2, Trash2, Book, Search, Loader2, CheckCircle, CircleOff, ArrowLeft, ArrowRight, ImagePlus, Film } from "lucide-react"
import type { Fiction, FictionWithMedia } from "@/src/fictions/fiction.domain"
import { Button } from "@/components/ui/button"
import { FormField } from "./form-field"
import { FICTION_GENRES } from "@/lib/constants/fiction-genres"
import { createFictionAction, deleteFictionAction, setFictionActiveAction, uploadFictionImageAction } from "@/lib/actions/fictions/fiction.actions"
import { DEFAULT_FICTION_COVER } from "@/lib/constants/placeholders"
import {
  AlertDialog,
  AlertDialogAction,
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
import { cn } from "@/lib/utils"

const FICTION_TYPES: { value: Fiction["type"]; label: string }[] = [
  { value: "movie", label: "Movie" },
  { value: "book", label: "Book" },
  { value: "tv-series", label: "TV Series" },
]

interface FictionFormData {
  title: string
  type: Fiction["type"]
  year: number
  genre: string
  synopsis: string
  active: boolean
  runtimeMinutes: string
}

type ViewMode = "cards" | "table"

interface FictionsTabProps {
  initialFictions?: FictionWithMedia[]
  onOpenFiction?: (fictionId: string) => void
  viewMode?: ViewMode
}

export function FictionsTab({ initialFictions, onOpenFiction, viewMode = "cards" }: FictionsTabProps) {
  const router = useRouter()
  const [fictions, setFictions] = useState<FictionWithMedia[]>(initialFictions ?? [])
  const [showWizard, setShowWizard] = useState(false)
  const [wizardStep, setWizardStep] = useState(0)
  const [searchTerm, setSearchTerm] = useState("")
  const [formData, setFormData] = useState<FictionFormData>({
    title: "",
    type: "movie",
    year: new Date().getFullYear(),
    genre: "",
    synopsis: "",
    active: true,
    runtimeMinutes: "",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [fictionToDelete, setFictionToDelete] = useState<Fiction | null>(null)
  const [deleteConfirmTitle, setDeleteConfirmTitle] = useState("")
  const [deleting, setDeleting] = useState(false)
  const [togglingActiveId, setTogglingActiveId] = useState<string | null>(null)
  const [fictionToDeactivate, setFictionToDeactivate] = useState<Fiction | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null)
  const [bannerFile, setBannerFile] = useState<File | null>(null)
  const [bannerPreviewUrl, setBannerPreviewUrl] = useState<string | null>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setFictions(initialFictions ?? [])
  }, [initialFictions])

  useEffect(() => {
    if (!coverFile) {
      if (coverPreviewUrl) URL.revokeObjectURL(coverPreviewUrl)
      setCoverPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(coverFile)
    setCoverPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [coverFile])

  useEffect(() => {
    if (!bannerFile) {
      if (bannerPreviewUrl) URL.revokeObjectURL(bannerPreviewUrl)
      setBannerPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(bannerFile)
    setBannerPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [bannerFile])

  const resetForm = () => {
    setFormData({
      title: "",
      type: "movie",
      year: new Date().getFullYear(),
      genre: "",
      synopsis: "",
      active: true,
      runtimeMinutes: "",
    })
    setCoverFile(null)
    setCoverPreviewUrl(null)
    setBannerFile(null)
    setBannerPreviewUrl(null)
  }

  const openWizard = () => {
    resetForm()
    setErrors({})
    setWizardStep(0)
    setShowWizard(true)
  }

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    setCoverFile(file ?? null)
    e.target.value = ""
  }

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    setBannerFile(file ?? null)
    e.target.value = ""
  }

  const closeWizard = () => {
    setShowWizard(false)
    setWizardStep(0)
    setErrors({})
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!formData.title.trim()) newErrors.title = "Title is required"
    if (!formData.genre) newErrors.genre = "Genre is required"
    if (!formData.synopsis.trim()) newErrors.synopsis = "Description is required"
    if (formData.year < 1900 || formData.year > new Date().getFullYear())
      newErrors.year = "Invalid year"
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)
    if (!validateForm()) return
    setSubmitting(true)
    const fd = new FormData()
    fd.set("title", formData.title)
    fd.set("type", formData.type)
    fd.set("year", String(formData.year))
    fd.set("genre", formData.genre)
    fd.set("synopsis", formData.synopsis)
    fd.set("active", formData.active ? "true" : "false")
    fd.set("runtimeMinutes", formData.runtimeMinutes ?? "")
    const result = await createFictionAction(fd)
    if (!result.success) {
      setSubmitting(false)
      setSubmitError(result.error)
      return
    }
    if (result.success && result.fiction.id) {
      if (coverFile) {
        const coverFd = new FormData()
        coverFd.set("file", coverFile)
        const coverResult = await uploadFictionImageAction(result.fiction.id, "cover", coverFd)
        if (!coverResult.success) {
          setSubmitError(coverResult.error)
          setSubmitting(false)
          return
        }
      }
      if (bannerFile) {
        const bannerFd = new FormData()
        bannerFd.set("file", bannerFile)
        const bannerResult = await uploadFictionImageAction(result.fiction.id, "banner", bannerFd)
        if (!bannerResult.success) {
          setSubmitError(bannerResult.error)
          setSubmitting(false)
          return
        }
      }
    }
    setSubmitting(false)
    closeWizard()
    resetForm()
    router.refresh()
    const newId = result.success ? result.fiction?.id : undefined
    if (newId && onOpenFiction) onOpenFiction(newId)
  }

  const filteredFictions = fictions.filter((fiction) =>
    fiction.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    fiction.type.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const openFiction = (id: string) => {
    if (!id) return
    if (onOpenFiction) onOpenFiction(id)
    else router.push(`/admin/fiction/${id}`)
  }

  const openDeleteModal = (e: React.MouseEvent, fiction: FictionWithMedia) => {
    e.stopPropagation()
    setFictionToDelete(fiction)
    setDeleteConfirmTitle("")
  }

  const closeDeleteModal = () => {
    setFictionToDelete(null)
    setDeleteConfirmTitle("")
  }

  const handleConfirmDelete = async () => {
    if (!fictionToDelete || deleteConfirmTitle !== fictionToDelete.title) return
    setDeleting(true)
    const result = await deleteFictionAction(fictionToDelete.id)
    setDeleting(false)
    if (result.success) {
      closeDeleteModal()
      setFictions((prev) => prev.filter((f) => f.id !== fictionToDelete.id))
      router.refresh()
    }
  }

  const deleteTitleMatches =
    fictionToDelete !== null && deleteConfirmTitle === fictionToDelete.title

  const handleSetActive = async (fiction: FictionWithMedia, active: boolean) => {
    setTogglingActiveId(fiction.id)
    setFictionToDeactivate(null)
    const result = await setFictionActiveAction(fiction.id, active)
    setTogglingActiveId(null)
    if (result.success) {
      setFictions((prev) =>
        prev.map((f) => (f.id === fiction.id ? { ...f, active } : f))
      )
      router.refresh()
    }
  }

  const confirmDeactivate = () => {
    if (fictionToDeactivate) {
      handleSetActive(fictionToDeactivate, false)
    }
  }

  if (showWizard) {
    return (
      <>
        <div className="fixed inset-0 bottom-[70px] md:bottom-0 md:left-[60px] z-[3000] bg-background flex flex-col overflow-hidden">
          {/* Top header — height matches sidebar (60px), never scrolls */}
          <header className="h-[60px] shrink-0 flex items-center gap-3 px-4 sm:px-6 border-b border-border bg-background">
            <button
              type="button"
              onClick={closeWizard}
              className="flex items-center justify-center h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Back to Fictions"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <Film className="h-5 w-5 text-muted-foreground shrink-0" />
            <h1 className="text-lg font-semibold text-foreground truncate">Create Fiction</h1>
          </header>

          <form id="fiction-create-form" onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 pt-8 sm:pt-10 pb-28">
              <div className="max-w-2xl space-y-8">
                {submitError && (
                  <p className="text-sm text-red-500 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2">
                    {submitError}
                  </p>
                )}

                {/* 4 inputs first */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField label="Title" required error={errors.title}>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g., Midnight in Paris"
                      className="w-full px-4 py-2 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground/20 transition-all"
                    />
                  </FormField>
                  <FormField label="Type" required>
                    <select
                      value={formData.type}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          type: e.target.value as Fiction["type"],
                        })
                      }
                      className="w-full px-4 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground/20 transition-all"
                    >
                      {FICTION_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
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
                      className="w-full px-4 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground/20 transition-all"
                    />
                  </FormField>
                  <FormField label="Genre" required error={errors.genre}>
                    <select
                      value={formData.genre}
                      onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground/20 transition-all"
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

                {/* Images, then description texts below */}
                <section className="space-y-3">
                  <input
                    ref={coverInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={handleCoverChange}
                  />
                  <input
                    ref={bannerInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={handleBannerChange}
                  />
                  <div className="flex flex-col sm:flex-row gap-4 sm:h-[200px]">
                    <button
                      type="button"
                      onClick={() => coverInputRef.current?.click()}
                      className="group relative w-[120px] sm:w-[140px] h-[180px] sm:h-full rounded-xl border border-border overflow-hidden bg-muted/30 flex items-center justify-center text-muted-foreground hover:border-foreground/30 hover:bg-muted/50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
                    >
                      {coverPreviewUrl ? (
                        <>
                          <Image
                            src={coverPreviewUrl}
                            alt="Cover preview"
                            fill
                            className="object-cover"
                            unoptimized
                          />
                          <span className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-end justify-center pb-2">
                            <span className="text-xs font-medium text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow">Change</span>
                          </span>
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={(e) => { e.stopPropagation(); setCoverFile(null) }}
                            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setCoverFile(null) } }}
                            className="absolute top-1.5 right-1.5 rounded bg-black/60 text-white text-[10px] px-1.5 py-0.5 hover:bg-black/80"
                          >
                            Remove
                          </span>
                        </>
                      ) : (
                        <ImagePlus className="h-10 w-10" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => bannerInputRef.current?.click()}
                      className="group relative flex-1 min-w-0 h-[180px] sm:h-full rounded-xl border border-border overflow-hidden bg-muted/30 flex items-center justify-center text-muted-foreground hover:border-foreground/30 hover:bg-muted/50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {bannerPreviewUrl ? (
                        <>
                          <Image
                            src={bannerPreviewUrl}
                            alt="Banner preview"
                            fill
                            className="object-cover"
                            unoptimized
                          />
                          <span className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                            <span className="text-xs font-medium text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow">Change</span>
                          </span>
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={(e) => { e.stopPropagation(); setBannerFile(null) }}
                            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setBannerFile(null) } }}
                            className="absolute top-1.5 right-1.5 rounded bg-black/60 text-white text-[10px] px-1.5 py-0.5 hover:bg-black/80"
                          >
                            Remove
                          </span>
                        </>
                      ) : (
                        <ImagePlus className="h-10 w-10" />
                      )}
                    </button>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      <strong className="text-foreground">Cover (optional):</strong> Ratio 2:3 portrait. JPG, PNG, WebP, GIF. Max 10 MB. We generate sm (300px) and lg (800px) WebP.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      <strong className="text-foreground">Banner (optional):</strong> Ratio 21:9 wide. JPG, PNG, WebP, GIF. Max 10 MB. We generate lg (800px) WebP.
                    </p>
                  </div>
                </section>

                <FormField label="Visibility">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.active}
                      onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                      className="rounded border-border bg-card text-foreground focus:ring-foreground/20"
                    />
                    <span className="text-sm text-foreground">Active (visible in search)</span>
                  </label>
                </FormField>

                {(formData.type === "movie" || formData.type === "tv-series") && (
                  <FormField label="Runtime (minutes)">
                    <input
                      type="number"
                      min={1}
                      step={1}
                      inputMode="numeric"
                      value={formData.runtimeMinutes}
                      onChange={(e) => setFormData({ ...formData, runtimeMinutes: e.target.value })}
                      placeholder="e.g. 120"
                      className="w-full px-4 py-2 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground/20 transition-all"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">Optional. Used to position scenes on the film timeline.</p>
                  </FormField>
                )}

                <FormField label="Description" required error={errors.synopsis}>
                  <textarea
                    value={formData.synopsis}
                    onChange={(e) => setFormData({ ...formData, synopsis: e.target.value })}
                    placeholder="Short description of the fiction..."
                    rows={4}
                    className="w-full px-4 py-2 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground/20 transition-all resize-none"
                  />
                </FormField>

                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Summary</p>
                  <div className="mt-3">
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
          </form>
        </div>

        {/* Fixed bottom bar — Cancel left, Create right */}
        <div className="fixed bottom-[70px] left-0 right-0 md:bottom-0 md:left-[60px] z-[3001] border-t border-border bg-background px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <Button type="button" variant="outline" onClick={closeWizard} className="rounded-xl px-6">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              type="submit"
              form="fiction-create-form"
              variant="cta"
              className="gap-2 rounded-xl px-6"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating…
                </>
              ) : (
                <>
                  Create Fiction
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </>
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
          <Button onClick={openWizard} variant="cta" className="gap-2">
            <Plus className="h-4 w-4" />
            Create Fiction
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search fictions..."
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
                className="group rounded-xl border border-border hover:border-foreground/30 hover:bg-card/50 transition-all overflow-hidden"
              >
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground truncate text-base">{fiction.title}</h3>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs font-medium uppercase px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                          {fiction.type}
                        </span>
                        <span className="text-xs text-muted-foreground">{fiction.year}</span>
                        <span
                          className={
                            fiction.active
                              ? "text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                              : "text-xs font-medium px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400"
                          }
                        >
                          {fiction.active ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground line-clamp-2">{fiction.description}</p>

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
                            openFiction(fiction.id)
                          }}
                        >
                          <Edit2 className="h-3 w-3" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            fiction.active
                              ? setFictionToDeactivate(fiction)
                              : handleSetActive(fiction, true)
                          }
                          disabled={togglingActiveId === fiction.id}
                        >
                          {togglingActiveId === fiction.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : fiction.active ? (
                            <CircleOff className="h-3 w-3" />
                          ) : (
                            <CheckCircle className="h-3 w-3" />
                          )}
                          {fiction.active ? "Deactivate" : "Activate"}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => openDeleteModal(e as unknown as React.MouseEvent, fiction)}
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
                <th className="text-xs font-semibold uppercase text-muted-foreground py-3 px-4 text-left">Title</th>
                <th className="text-xs font-semibold uppercase text-muted-foreground py-3 px-4 text-left">Type</th>
                <th className="text-xs font-semibold uppercase text-muted-foreground py-3 px-4 text-left">Year</th>
                <th className="text-xs font-semibold uppercase text-muted-foreground py-3 px-4 text-left">Genre</th>
                <th className="text-xs font-semibold uppercase text-muted-foreground py-3 px-4 text-left">Status</th>
                <th className="text-xs font-semibold uppercase text-muted-foreground py-3 px-4 text-left w-20">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredFictions.map((fiction) => (
                <tr
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
                  className="border-b border-border hover:bg-card/50 transition-colors last:border-b-0"
                >
                  <td className="py-3 px-4 text-left font-medium text-foreground">{fiction.title}</td>
                  <td className="py-3 px-4 text-left text-sm text-muted-foreground capitalize">{fiction.type.replace("-", " ")}</td>
                  <td className="py-3 px-4 text-left text-sm text-muted-foreground">{fiction.year}</td>
                  <td className="py-3 px-4 text-left text-sm text-muted-foreground">{fiction.genre}</td>
                  <td className="py-3 px-4 text-left">
                    <span
                      className={
                        fiction.active
                          ? "text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                          : "text-xs font-medium px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400"
                      }
                    >
                      {fiction.active ? "Active" : "Inactive"}
                    </span>
                  </td>
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
                        <DropdownMenuItem onClick={() => openFiction(fiction.id)}>
                          <Edit2 className="h-3 w-3" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            fiction.active
                              ? setFictionToDeactivate(fiction)
                              : handleSetActive(fiction, true)
                          }
                          disabled={togglingActiveId === fiction.id}
                        >
                          {togglingActiveId === fiction.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : fiction.active ? (
                            <CircleOff className="h-3 w-3" />
                          ) : (
                            <CheckCircle className="h-3 w-3" />
                          )}
                          {fiction.active ? "Deactivate" : "Activate"}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => openDeleteModal(e as unknown as React.MouseEvent, fiction)}
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

      <AlertDialog
        open={fictionToDeactivate !== null}
        onOpenChange={(open) => {
          if (!open) setFictionToDeactivate(null)
        }}
      >
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate fiction</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to deactivate this fiction. It will no longer appear in search results.
              {fictionToDeactivate && (
                <span className="mt-2 block font-semibold text-foreground">«{fictionToDeactivate.title}»</span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setFictionToDeactivate(null)}>Cancel</AlertDialogCancel>
            <Button
              variant="secondary"
              disabled={togglingActiveId === fictionToDeactivate?.id}
              onClick={confirmDeactivate}
            >
              {togglingActiveId === fictionToDeactivate?.id ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deactivating…
                </>
              ) : (
                "Deactivate"
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={fictionToDelete !== null} onOpenChange={(open) => { if (!open) closeDeleteModal() }}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete fiction</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. To confirm, type the exact name of the fiction to delete.
              {fictionToDelete && (
                <span className="mt-2 block font-semibold text-foreground">«{fictionToDelete.title}»</span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <input
              type="text"
              value={deleteConfirmTitle}
              onChange={(e) => setDeleteConfirmTitle(e.target.value)}
              placeholder="Exact name of the movie/fiction"
              className="w-full px-4 py-2 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground/20"
              autoFocus
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={closeDeleteModal}>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={!deleteTitleMatches || deleting}
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

