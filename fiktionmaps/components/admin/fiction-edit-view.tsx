"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react"
import { motion } from "framer-motion"
import type { Fiction } from "@/modules/fictions/fiction.domain"
import { Button } from "@/components/ui/button"
import { FormField } from "./form-field"
import { FICTION_GENRES } from "@/lib/constants/fiction-genres"
import { updateFictionAction } from "@/app/(app)/admin/actions"
import Link from "next/link"
import { cn } from "@/lib/utils"

const FICTION_TYPES: { value: Fiction["type"]; label: string }[] = [
  { value: "movie", label: "Movie" },
  { value: "book", label: "Book" },
  { value: "tv-series", label: "TV Series" },
]

interface FictionEditViewProps {
  initialFiction: Fiction
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
  }
}

const inputClass = cn(
  "w-full rounded-xl border border-border bg-card px-4 py-3 text-base outline-none transition-[border-color,box-shadow]",
  "placeholder:text-muted-foreground text-foreground focus:ring-2 focus:ring-foreground/20 focus:border-foreground"
)

const stepVariants = {
  initial: { opacity: 0, x: 40, filter: "blur(6px)" },
  animate: { opacity: 1, x: 0, filter: "blur(0px)" },
  exit: { opacity: 0, x: -40, filter: "blur(6px)" },
}

export function FictionEditView({ initialFiction }: FictionEditViewProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const initialForm = useMemo(() => toFormState(initialFiction), [initialFiction])
  const [formData, setFormData] = useState(initialForm)

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
    const result = await updateFictionAction(initialFiction.id, fd)
    setSaving(false)
    if (result.success) {
      router.push("/admin")
      router.refresh()
    } else {
      setErrors({ submit: result.error })
    }
  }

  return (
    <>
      <motion.div
        key="fiction-edit"
        variants={stepVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="fixed inset-0 bottom-[70px] md:bottom-0 md:left-[60px] z-[3000] bg-background flex flex-col overflow-y-auto"
      >
        {/* Header — same layout as city edit */}
        <div className="px-4 sm:px-6 pt-6 pb-4 shrink-0">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground mb-3"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Fictions
          </Link>
          <h1 className="font-sans text-2xl font-bold text-foreground">
            Edit fiction
          </h1>
          <p className="font-sans text-sm text-muted-foreground mt-1">
            {formData.title || initialFiction.title}
          </p>
        </div>

        {/* Scrollable form content */}
        <form
          id="fiction-edit-form"
          onSubmit={handleSubmit}
          className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 pb-4"
        >
          <div className="max-w-lg w-full space-y-6">
        <FormField label="Title" required error={errors.title}>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
            placeholder="e.g., Midnight in Paris"
            className={inputClass}
          />
        </FormField>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
        </div>

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

        <FormField label="Synopsis" required error={errors.synopsis}>
          <textarea
            value={formData.synopsis}
            onChange={(e) => setFormData((p) => ({ ...p, synopsis: e.target.value }))}
            placeholder="Short description of the fiction..."
            rows={5}
            className={cn(inputClass, "resize-none")}
          />
        </FormField>
          </div>
        </form>
      </motion.div>

      {/* Fixed bottom bar — same as city edit */}
      <div className="fixed bottom-[70px] left-0 right-0 md:bottom-0 md:left-[60px] z-[3001] border-t border-border bg-background px-4 sm:px-6 py-4">
        {errors.submit && (
          <p className="mb-3 text-center text-sm text-destructive">{errors.submit}</p>
        )}
        <div className="flex items-center justify-between gap-4">
          <Link href="/admin">
            <Button type="button" variant="outline" className="rounded-xl px-6">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            form="fiction-edit-form"
            disabled={saving}
            variant="cta"
            className="gap-2 rounded-xl px-6"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save changes
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </>
  )
}
