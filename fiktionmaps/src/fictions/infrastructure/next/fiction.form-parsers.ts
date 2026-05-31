import { createFictionFormSchema, updateFictionFormSchema } from "@/src/fictions/domain/fiction.schemas"
import { imdbExternalIdFormField } from "@/src/fiction-external-ids/domain/fiction-external-id.schemas"

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

function parseOptionalFormUuid(entry: FormDataEntryValue | null): string | undefined {
  if (entry == null) return undefined
  const s = String(entry).trim()
  return s.length > 0 ? s : undefined
}

function parseOptionalFictionStatus(entry: FormDataEntryValue | null): string | undefined {
  if (entry == null) return undefined
  const s = String(entry).trim()
  return s.length > 0 ? s : undefined
}

function parseLanguageCode(entry: FormDataEntryValue | null): string | null {
  if (!entry) return null
  const s = String(entry).trim()
  return s.length > 0 ? s : null
}

function parseCreateFictionFormPayload(formData: FormData) {
  return {
    title: String(formData.get("title") ?? ""),
    type: String(formData.get("type") ?? ""),
    year: String(formData.get("year") ?? ""),
    genre: String(formData.get("genre") ?? ""),
    description: String(formData.get("description") ?? ""),
    active: formData.get("active") !== "false",
    duration_sec: parseRuntimeSec(formData.get("runtimeMinutes")),
    slug: parseSlug(formData.get("slug")),
    created_by: parseOptionalFormUuid(formData.get("createdBy")),
    status: parseOptionalFictionStatus(formData.get("fictionStatus")),
    original_language: parseLanguageCode(formData.get("originalLanguage")),
    content_language: parseLanguageCode(formData.get("contentLanguage")),
  }
}

export function parseImdbIdFromFormData(formData: FormData) {
  return imdbExternalIdFormField.safeParse(formData.get("imdbId") ?? "")
}

export function parseCreateFictionFormData(formData: FormData) {
  return createFictionFormSchema.safeParse(parseCreateFictionFormPayload(formData))
}

export function parseUpdateFictionFormData(formData: FormData) {
  const base = {
    title: String(formData.get("title") ?? ""),
    type: String(formData.get("type") ?? ""),
    year: String(formData.get("year") ?? ""),
    genre: String(formData.get("genre") ?? ""),
    description: String(formData.get("description") ?? ""),
    active: formData.get("active") !== "false",
    duration_sec: parseRuntimeSec(formData.get("runtimeMinutes")),
    slug: parseSlug(formData.get("slug")),
    original_language: parseLanguageCode(formData.get("originalLanguage")),
    content_language: parseLanguageCode(formData.get("contentLanguage")),
  }
  return updateFictionFormSchema.safeParse(base)
}
