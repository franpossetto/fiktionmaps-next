import { createFictionFormSchema, updateFictionFormSchema } from "@/src/fictions/domain/fiction.schemas"

function parseRuntimeSec(runtimeMinutes: FormDataEntryValue | null): number | null {
  if (!runtimeMinutes) return null
  const raw = String(runtimeMinutes).trim()
  if (!raw) return null
  const n = parseInt(raw, 10)
  return Number.isNaN(n) || n <= 0 ? null : n * 60
}

function parseSlug(raw: FormDataEntryValue | null): string | null {
  if (!raw) return null
  const s = String(raw).trim()
  return s.length > 0 ? s : null
}

export function parseCreateFictionFormData(formData: FormData) {
  return createFictionFormSchema.safeParse({
    title: String(formData.get("title") ?? ""),
    type: String(formData.get("type") ?? ""),
    year: String(formData.get("year") ?? ""),
    genre: String(formData.get("genre") ?? ""),
    description: String(formData.get("description") ?? ""),
    active: formData.get("active") !== "false",
    duration_sec: parseRuntimeSec(formData.get("runtimeMinutes")),
    author: null,
    slug: parseSlug(formData.get("slug")),
  })
}

export function parseUpdateFictionFormData(formData: FormData) {
  const type = String(formData.get("type") ?? "")
  const director = String(formData.get("director") ?? "").trim()
  const author = String(formData.get("author") ?? "").trim()

  return updateFictionFormSchema.safeParse({
    title: String(formData.get("title") ?? ""),
    type,
    year: String(formData.get("year") ?? ""),
    genre: String(formData.get("genre") ?? ""),
    description: String(formData.get("description") ?? ""),
    author: type === "movie" ? director || null : author || null,
    active: formData.get("active") !== "false",
    duration_sec: parseRuntimeSec(formData.get("runtimeMinutes")),
    slug: parseSlug(formData.get("slug")),
  })
}
