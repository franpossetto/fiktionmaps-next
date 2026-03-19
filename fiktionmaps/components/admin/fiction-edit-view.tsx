"use client"

import { useState, useMemo, useRef } from "react"
import Image from "next/image"
import { useRouter, Link } from "@/i18n/navigation"
import { ArrowLeft, ArrowRight, Loader2, ImagePlus, Film, Trash2 } from "lucide-react"
import type { Fiction, FictionWithMedia } from "@/src/fictions/fiction.domain"
import { Button } from "@/components/ui/button"
import { FormField } from "./form-field"
import { FICTION_GENRES } from "@/lib/constants/fiction-genres"
import { updateFictionAction, uploadFictionImageAction, deleteFictionAction } from "@/src/fictions/fiction.actions"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"

const FICTION_TYPES: { value: Fiction["type"]; label: string }[] = [
  { value: "movie", label: "Movie" },
  { value: "book", label: "Book" },
  { value: "tv-series", label: "TV Series" },
]

interface FictionEditViewProps {
  initialFiction: FictionWithMedia
}

function toFormState(f: Fiction) {
  return {
    title: f.title,
    type: f.type,
    year: f.year,
    director: f.type === "movie" ? (f.author ?? "") : "",
    author: f.type !== "movie" ? (f.author ?? "") : "",
    genre: f.genre,
    synopsis: f.description,
    active: f.active,
  }
}

export function FictionEditView({ initialFiction }: FictionEditViewProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const initialForm = useMemo(() => toFormState(initialFiction), [initialFiction])
  const [formData, setFormData] = useState(initialForm)
  const [coverImage, setCoverImage] = useState<string | null>(
    initialFiction.coverImage ?? initialFiction.coverImageLarge ?? null
  )
  const [bannerImage, setBannerImage] = useState<string | null>(
    initialFiction.bannerImage ?? initialFiction.coverImageLarge ?? initialFiction.coverImage ?? null
  )
  const [uploadingCover, setUploadingCover] = useState(false)
  const [uploadingBanner, setUploadingBanner] = useState(false)
  const [imageError, setImageError] = useState<string | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteConfirmTitle, setDeleteConfirmTitle] = useState("")
  const [deleting, setDeleting] = useState(false)
  const coverInputRef = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)

  const deleteTitleMatches = deleteConfirmTitle === initialFiction.title

  const handleConfirmDelete = async () => {
    if (!deleteTitleMatches || deleting) return
    setDeleting(true)
    const result = await deleteFictionAction(initialFiction.id)
    setDeleting(false)
    if (result.success) {
      setShowDeleteDialog(false)
      setDeleteConfirmTitle("")
      router.push("/admin")
      router.refresh()
    }
  }

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!formData.title.trim()) newErrors.title = "Title is required"
    if (formData.year < 1900 || formData.year > new Date().getFullYear())
      newErrors.year = "Invalid year"
    if (!formData.synopsis.trim()) newErrors.synopsis = "Description is required"
    if (!formData.genre.trim()) newErrors.genre = "Genre is required"
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleUploadCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageError(null)
    setUploadingCover(true)
    const fd = new FormData()
    fd.set("file", file)
    const result = await uploadFictionImageAction(initialFiction.id, "cover", fd)
    setUploadingCover(false)
    e.target.value = ""
    if (result.success && result.coverImage) {
      setCoverImage(result.coverImage)
      router.refresh()
    } else if (!result.success) {
      setImageError(result.error ?? null)
    }
  }

  const handleUploadBanner = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageError(null)
    setUploadingBanner(true)
    const fd = new FormData()
    fd.set("file", file)
    const result = await uploadFictionImageAction(initialFiction.id, "banner", fd)
    setUploadingBanner(false)
    e.target.value = ""
    if (result.success && result.bannerImage) {
      setBannerImage(result.bannerImage)
      router.refresh()
    } else if (!result.success) {
      setImageError(result.error ?? null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    setErrors({})
    const fd = new FormData()
    fd.set("title", formData.title)
    fd.set("type", formData.type)
    fd.set("year", String(formData.year))
    fd.set("genre", formData.genre)
    fd.set("synopsis", formData.synopsis)
    fd.set("director", formData.director)
    fd.set("author", formData.author)
    fd.set("active", formData.active ? "true" : "false")
    const result = await updateFictionAction(initialFiction.id, fd)
    setSaving(false)
    if (result.success) {
      router.push("/admin")
      router.refresh()
    } else {
      setErrors({ submit: result.error })
    }
  }

  const inputClass = cn(
    "w-full rounded-lg border border-border bg-card px-4 py-2 text-foreground placeholder:text-muted-foreground outline-none transition-all",
    "focus:border-foreground focus:ring-1 focus:ring-foreground/20"
  )

  return (
    <>
      <div className="fixed inset-0 bottom-[70px] md:bottom-0 md:left-[60px] z-[3000] bg-background flex flex-col overflow-hidden">
        <header className="h-[60px] shrink-0 flex items-center gap-3 px-4 sm:px-6 border-b border-border bg-background">
          <Link
            href="/admin"
            className="flex items-center justify-center h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Back to Fictions"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <Film className="h-5 w-5 text-muted-foreground shrink-0" />
          <h1 className="text-lg font-semibold text-foreground truncate">Edit fiction</h1>
        </header>

        <form
          id="fiction-edit-form"
          onSubmit={handleSubmit}
          className="flex flex-col flex-1 min-h-0 overflow-hidden"
        >
          <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 pt-8 sm:pt-10 pb-28">
            <div className="max-w-2xl space-y-8">
              {errors.submit && (
                <p className="text-sm text-red-500 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2">
                  {errors.submit}
                </p>
              )}
              {imageError && (
                <p className="text-sm text-red-500 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2">
                  {imageError}
                </p>
              )}

              {/* 4 inputs first — same as create */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Title" required error={errors.title}>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
                    placeholder="e.g., Midnight in Paris"
                    className={inputClass}
                  />
                </FormField>
                <FormField label="Type" required>
                  <select
                    value={formData.type}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, type: e.target.value as Fiction["type"] }))
                    }
                    className={cn(inputClass, "text-foreground")}
                  >
                    {FICTION_TYPES.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Year" required error={errors.year}>
                  <input
                    type="number"
                    value={formData.year}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10)
                      setFormData((p) => ({ ...p, year: Number.isNaN(v) ? p.year : v }))
                    }}
                    min={1900}
                    max={new Date().getFullYear()}
                    className={inputClass}
                  />
                </FormField>
                <FormField label="Genre" required error={errors.genre}>
                  <select
                    value={formData.genre}
                    onChange={(e) => setFormData((p) => ({ ...p, genre: e.target.value }))}
                    className={cn(inputClass, "text-foreground")}
                  >
                    <option value="">Select genre</option>
                    {FICTION_GENRES.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                    {formData.genre &&
                      !FICTION_GENRES.includes(formData.genre as (typeof FICTION_GENRES)[number]) && (
                        <option value={formData.genre}>{formData.genre}</option>
                      )}
                  </select>
                </FormField>
              </div>

              {/* Images — same layout as create */}
              <section className="space-y-3">
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  disabled={uploadingCover}
                  onChange={handleUploadCover}
                />
                <input
                  ref={bannerInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  disabled={uploadingBanner}
                  onChange={handleUploadBanner}
                />
                <div className="flex flex-col sm:flex-row gap-4 sm:h-[200px]">
                  <button
                    type="button"
                    onClick={() => !uploadingCover && coverInputRef.current?.click()}
                    disabled={uploadingCover}
                    className="group relative w-[120px] sm:w-[140px] h-[180px] sm:h-full rounded-xl border border-border overflow-hidden bg-muted/30 flex items-center justify-center text-muted-foreground hover:border-foreground/30 hover:bg-muted/50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0 disabled:opacity-60"
                  >
                    {coverImage ? (
                      <>
                        <Image
                          src={coverImage}
                          alt="Cover"
                          fill
                          className="object-cover"
                          unoptimized={coverImage.startsWith("http")}
                        />
                        <span className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-end justify-center pb-2">
                          <span className="text-xs font-medium text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow">
                            {uploadingCover ? "Uploading…" : "Change"}
                          </span>
                        </span>
                      </>
                    ) : (
                      <>
                        {uploadingCover ? (
                          <Loader2 className="h-10 w-10 animate-spin" />
                        ) : (
                          <ImagePlus className="h-10 w-10" />
                        )}
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => !uploadingBanner && bannerInputRef.current?.click()}
                    disabled={uploadingBanner}
                    className="group relative flex-1 min-w-0 h-[180px] sm:h-full rounded-xl border border-border overflow-hidden bg-muted/30 flex items-center justify-center text-muted-foreground hover:border-foreground/30 hover:bg-muted/50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
                  >
                    {bannerImage ? (
                      <>
                        <Image
                          src={bannerImage}
                          alt="Banner"
                          fill
                          className="object-cover"
                          unoptimized
                        />
                        <span className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                          <span className="text-xs font-medium text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow">
                            {uploadingBanner ? "Uploading…" : "Change"}
                          </span>
                        </span>
                      </>
                    ) : (
                      <>
                        {uploadingBanner ? (
                          <Loader2 className="h-10 w-10 animate-spin" />
                        ) : (
                          <ImagePlus className="h-10 w-10" />
                        )}
                      </>
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

              {formData.type === "movie" && (
                <FormField label="Director">
                  <input
                    type="text"
                    value={formData.director}
                    onChange={(e) => setFormData((p) => ({ ...p, director: e.target.value }))}
                    placeholder="Director name"
                    className={inputClass}
                  />
                </FormField>
              )}
              {(formData.type === "book" || formData.type === "tv-series") && (
                <FormField label="Author / Creator">
                  <input
                    type="text"
                    value={formData.author}
                    onChange={(e) => setFormData((p) => ({ ...p, author: e.target.value }))}
                    placeholder="Author or show creator"
                    className={inputClass}
                  />
                </FormField>
              )}

              <FormField label="Visibility">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.active}
                    onChange={(e) => setFormData((p) => ({ ...p, active: e.target.checked }))}
                    className="rounded border-border bg-card text-foreground focus:ring-foreground/20"
                  />
                  <span className="text-sm text-foreground">Active (visible in search)</span>
                </label>
              </FormField>

              <FormField label="Description" required error={errors.synopsis}>
                <textarea
                  value={formData.synopsis}
                  onChange={(e) => setFormData((p) => ({ ...p, synopsis: e.target.value }))}
                  placeholder="Short description of the fiction..."
                  rows={4}
                  className={cn(inputClass, "resize-none")}
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

      <div className="fixed bottom-[70px] left-0 right-0 md:bottom-0 md:left-[60px] z-[3001] border-t border-border bg-background px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Link href="/admin">
              <Button type="button" variant="outline" className="rounded-xl px-6">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </Link>
            <Button
              type="button"
              variant="outline"
              className="rounded-xl px-6 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => {
                setDeleteConfirmTitle("")
                setShowDeleteDialog(true)
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
          <Button
            type="submit"
            form="fiction-edit-form"
            disabled={saving}
            variant="cta"
            className="gap-2 rounded-xl px-6"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                Save changes
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={(open) => { if (!open) { setShowDeleteDialog(false); setDeleteConfirmTitle("") } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete fiction</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. To confirm, type the exact name of the fiction to delete.
              <span className="mt-2 block font-semibold text-foreground">«{initialFiction.title}»</span>
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
            <AlertDialogCancel onClick={() => { setShowDeleteDialog(false); setDeleteConfirmTitle("") }}>Cancel</AlertDialogCancel>
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
    </>
  )
}
