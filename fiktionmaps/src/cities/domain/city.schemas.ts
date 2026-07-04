import { z } from "zod"

export const cityWriteSchema = z.object({
  name: z.string().trim().min(1),
  country: z.string().trim().min(1),
  lat: z.coerce.number().refine((n) => n >= -90 && n <= 90, "Invalid latitude"),
  lng: z.coerce.number().refine((n) => n >= -180 && n <= 180, "Invalid longitude"),
  zoom: z.coerce.number().int().min(0).max(22),
  image_url: z.string().url().nullable().optional(),
})

export type CreateCityData = z.infer<typeof cityWriteSchema>
export type UpdateCityData = Partial<CreateCityData>

export function parseCityFormData(formData: FormData) {
  const rawImageUrl = String(formData.get("image_url") ?? "").trim()
  return cityWriteSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    country: String(formData.get("country") ?? ""),
    lat: String(formData.get("lat") ?? ""),
    lng: String(formData.get("lng") ?? ""),
    zoom: String(formData.get("zoom") ?? ""),
    image_url: rawImageUrl || null,
  })
}
