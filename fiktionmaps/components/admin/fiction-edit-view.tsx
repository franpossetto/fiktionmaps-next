"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Loader2, ImageIcon, Upload } from "lucide-react"
import type { Fiction } from "@/lib/modules/fictions"
import { useApi } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { FormField } from "./form-field"
import { FICTION_GENRES } from "@/lib/constants/fiction-genres"
import { DEFAULT_FICTION_COVER } from "@/lib/constants/placeholders"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import Link from "next/link"

const FICTION_TYPES: { value: Fiction["type"]; label: string }[] = [
  { value: "movie", label: "Movie" },
  { value: "book", label: "Book" },
  { value: "tv-series", label: "TV Series" },
]

interface FictionEditViewProps {
  fictionId: string
}

export function FictionEditView({ fictionId }: FictionEditViewProps) {
  const router = useRouter()
  const { fictions: fictionsService } = useApi()
  const [fiction, setFiction] = useState<Fiction | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [editingImage, setEditingImage] = useState<"cover" | "banner" | null>(null)

  const [formData, setFormData] = useState({
    title: "",
    type: "movie" as Fiction["type"],
    year: new Date().getFullYear(),
    director: "",
    author: "",
    posterColor: "#1a1a2e",
    genre: "",
    coverImage: "",
    bannerImage: "",
    synopsis: "",
  })

  const coverFileInputRef = useRef<HTMLInputElement>(null)
  const bannerFileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fictionsService.getById(fictionId).then((f) => {
      setLoading(false)
      if (f) {
        setFiction(f)
        setFormData({
          title: f.title,
          type: f.type,
          year: f.year,
          director: f.director ?? "",
          author: f.author ?? "",
          posterColor: f.posterColor,
          genre: f.genre,
          coverImage: f.coverImage ?? "",
          bannerImage: f.bannerImage ?? "",
          synopsis: f.synopsis,
        })
      }
    })
  }, [fictionId, fictionsService])

  const dialogUrl = editingImage === "cover" ? formData.coverImage : formData.bannerImage
  const setDialogUrl = (value: string) =>
    setFormData((p) =>
      editingImage === "cover"
        ? { ...p, coverImage: value }
        : { ...p, bannerImage: value }
    )
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, kind: "cover" | "banner") => {
    const file = e.target.files?.[0]
    if (!file?.type.startsWith("image/")) return
    const url = URL.createObjectURL(file)
    setFormData((p) =>
      kind === "cover" ? { ...p, coverImage: url } : { ...p, bannerImage: url }
    )
    setEditingImage(null)
    e.target.value = ""
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fiction || !validate()) return
    setSaving(true)
    try {
      await fictionsService.update(fiction.id, {
        title: formData.title.trim(),
        type: formData.type,
        year: formData.year,
        director: formData.director.trim() || undefined,
        author: formData.author.trim() || undefined,
        posterColor: formData.posterColor,
        genre: formData.genre.trim(),
        coverImage: formData.coverImage.trim() || undefined,
        bannerImage: formData.bannerImage.trim() || undefined,
        synopsis: formData.synopsis.trim(),
      })
      router.push("/admin")
      router.refresh()
    } catch {
      setErrors({ submit: "Failed to save. Try again." })
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[320px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!fiction) {
    return (
      <div className="space-y-4">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Admin
        </Link>
        <p className="text-muted-foreground">Fiction not found.</p>
      </div>
    )
  }

  const inputClass =
    "w-full px-4 py-2 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-all"

  const coverSrc = formData.coverImage?.trim() || null
  const bannerSrc = formData.bannerImage?.trim() || null

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Back */}
      <Link
        href="/admin"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Admin
      </Link>

      {/* Hero: banner or gradient + title — click banner to edit banner URL */}
      <div
        className="relative h-44 sm:h-52 rounded-2xl overflow-hidden border border-border/60 shadow-lg"
        style={{ backgroundColor: formData.posterColor }}
      >
        <button
          type="button"
          onClick={() => setEditingImage("banner")}
          className="absolute inset-0 w-full h-full cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
          aria-label="Edit banner image"
        >
          {bannerSrc ? (
            <img
              src={bannerSrc}
              alt="Banner"
              className="absolute inset-0 w-full h-full object-cover pointer-events-none"
              onError={(e) => {
                e.currentTarget.style.display = "none"
              }}
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />
          <div className="absolute bottom-4 left-4 right-4 sm:left-36 sm:right-6 pointer-events-none flex flex-col justify-end items-start text-left min-h-0 sm:min-h-[120px]">
            <h1 className="text-2xl sm:text-3xl font-bold text-white drop-shadow-md text-left">
              {formData.title || fiction.title}
            </h1>
            <p className="text-sm text-white/90 mt-0.5 text-left">Click banner or cover to edit</p>
          </div>
        </button>
        {/* Cover thumbnail — click to edit cover URL */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setEditingImage("cover")
          }}
          className="absolute left-4 bottom-4 w-20 h-[120px] rounded-lg overflow-hidden border-2 border-white/30 shadow-xl hidden sm:block cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background hover:border-white/60 transition-colors"
          aria-label="Edit cover image"
        >
          {coverSrc ? (
            <img
              src={coverSrc}
              alt="Cover"
              className="w-full h-full object-cover pointer-events-none"
              onError={(e) => {
                e.currentTarget.src = DEFAULT_FICTION_COVER
              }}
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center bg-muted/80 pointer-events-none"
              style={{ backgroundColor: formData.posterColor }}
            >
              <ImageIcon className="h-8 w-8 text-white/50" />
            </div>
          )}
        </button>
      </div>

      {/* Dialog: upload or paste URL when user clicked an image */}
      <Dialog open={!!editingImage} onOpenChange={(open) => !open && setEditingImage(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingImage === "cover" ? "Change cover image" : "Change banner image"}
            </DialogTitle>
            <DialogDescription>
              Upload an image or paste a URL. Cover is portrait (e.g. 2:3), banner is wide (e.g. 16:9).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <input
                ref={editingImage === "cover" ? coverFileInputRef : bannerFileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => editingImage && handleFileChange(e, editingImage)}
              />
              <Button
                type="button"
                variant="outline"
                className="w-full gap-2"
                onClick={() =>
                  (editingImage === "cover" ? coverFileInputRef : bannerFileInputRef).current?.click()
                }
              >
                <Upload className="h-4 w-4" />
                Upload image
              </Button>
            </div>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase text-muted-foreground">
                <span className="bg-background px-2">Or paste URL</span>
              </div>
            </div>
            <input
              type="url"
              value={dialogUrl}
              onChange={(e) => setDialogUrl(e.target.value)}
              placeholder={
                editingImage === "cover" ? "/covers/… or https://…" : "/banners/… or https://…"
              }
              className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30"
              aria-label={editingImage === "cover" ? "Cover image URL" : "Banner image URL"}
            />
          </div>
          <DialogFooter>
            <Button type="button" onClick={() => setEditingImage(null)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Details card */}
        <section className="rounded-2xl border border-border bg-card/50 p-5 sm:p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground mb-4">Details</h2>
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
              className={inputClass}
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
              onChange={(e) =>
                setFormData((p) => ({ ...p, year: parseInt(e.target.value, 10) }))
              }
              min={1900}
              max={new Date().getFullYear()}
              className={inputClass}
            />
          </FormField>

          <FormField label="Genre" required error={errors.genre}>
            <select
              value={formData.genre}
              onChange={(e) => setFormData((p) => ({ ...p, genre: e.target.value }))}
              className={inputClass}
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

          {formData.type === "movie" && (
            <div className="sm:col-span-2">
              <FormField label="Director">
                <input
                  type="text"
                  value={formData.director}
                  onChange={(e) => setFormData((p) => ({ ...p, director: e.target.value }))}
                  placeholder="Director name"
                  className={inputClass}
                />
              </FormField>
            </div>
          )}

          {(formData.type === "book" || formData.type === "tv-series") && (
            <div className="sm:col-span-2">
              <FormField label="Author / Creator">
                <input
                  type="text"
                  value={formData.author}
                  onChange={(e) => setFormData((p) => ({ ...p, author: e.target.value }))}
                  placeholder="Author or show creator"
                  className={inputClass}
                />
              </FormField>
            </div>
          )}

          <FormField
            label="Poster color"
            hint="Accent color for badges and chips on the map, location detail, and scene viewer."
          >
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={formData.posterColor}
                onChange={(e) => setFormData((p) => ({ ...p, posterColor: e.target.value }))}
                className="h-10 w-14 rounded border border-border cursor-pointer bg-card"
              />
              <input
                type="text"
                value={formData.posterColor}
                onChange={(e) => setFormData((p) => ({ ...p, posterColor: e.target.value }))}
                placeholder="#1a1a2e"
                className={inputClass}
              />
            </div>
          </FormField>

          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card/50 p-5 sm:p-6 shadow-sm">
        <FormField label="Synopsis" required error={errors.synopsis}>
          <textarea
            value={formData.synopsis}
            onChange={(e) => setFormData((p) => ({ ...p, synopsis: e.target.value }))}
            placeholder="Short description of the fiction..."
            rows={5}
            className={`${inputClass} resize-none`}
          />
        </FormField>
        </section>

        {errors.submit && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600">
            {errors.submit}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Button
            type="submit"
            disabled={saving}
            className="gap-2 border border-cyan-500/30 bg-cyan-500/10 text-cyan-600 hover:bg-cyan-500/20"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : null}
            Save changes
          </Button>
          <Link href="/admin">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  )
}
