import { createFictionFormSchema, updateFictionFormSchema } from "@/src/fictions/domain/fiction.schemas"

function parseRuntimeSec(runtimeMinutes: FormDataEntryValue | null): number | null {
  if (!runtimeMinutes) return null
  const raw = String(runtimeMinutes).trim()
  if (!raw) return null
  const n = parseInt(raw, 10)
  return Number.isNaN(n) || n <= 0 ? null : n * 60
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
  })
}
