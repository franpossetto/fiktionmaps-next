import { z } from "zod"
import { isValidCitySlug, normalizeCitySlugInput } from "@/src/cities/domain/city-slug"

export const cityWriteSchema = z.object({
  name: z.string().trim().min(1),
  country: z.string().trim().min(1),
  lat: z.coerce.number().refine((n) => n >= -90 && n <= 90, "Invalid latitude"),
  lng: z.coerce.number().refine((n) => n >= -180 && n <= 180, "Invalid longitude"),
  zoom: z.coerce.number().int().min(0).max(22),
  image_url: z.string().url().nullable().optional(),
  /** Mapbox region/state — used only to build slug candidates; not persisted. */
  region: z.string().trim().min(1).optional(),
})

export type CreateCityData = z.infer<typeof cityWriteSchema>

const citySlugField = z
  .string()
  .trim()
  .min(2)
  .max(120)
  .refine((s) => isValidCitySlug(s), "Invalid slug format")

/** Admin update: name/coords/image; optional explicit slug (never auto from name). */
export const cityUpdateSchema = cityWriteSchema
  .omit({ region: true })
  .partial()
  .extend({
    slug: citySlugField.optional(),
  })
  .refine((v) => Object.keys(v).length > 0, "No fields to update")

export type UpdateCityData = z.infer<typeof cityUpdateSchema>

export function parseCityFormData(formData: FormData) {
  const rawImageUrl = String(formData.get("image_url") ?? "").trim()
  return cityWriteSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    country: String(formData.get("country") ?? ""),
    lat: String(formData.get("lat") ?? ""),
    lng: String(formData.get("lng") ?? ""),
    zoom: String(formData.get("zoom") ?? ""),
    image_url: rawImageUrl || null,
    region: String(formData.get("region") ?? "").trim() || undefined,
  })
}

export function parseCityUpdateFormData(formData: FormData) {
  const rawImageUrl = String(formData.get("image_url") ?? "").trim()
  const rawSlug = String(formData.get("slug") ?? "").trim()
  const normalizedSlug = rawSlug ? normalizeCitySlugInput(rawSlug) : undefined
  if (rawSlug && !normalizedSlug) {
    return cityUpdateSchema.safeParse({ slug: rawSlug })
  }
  return cityUpdateSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    country: String(formData.get("country") ?? ""),
    lat: String(formData.get("lat") ?? ""),
    lng: String(formData.get("lng") ?? ""),
    zoom: String(formData.get("zoom") ?? ""),
    image_url: rawImageUrl || null,
    slug: normalizedSlug,
  })
}
