import { z } from "zod"
import { latitudeSchema, longitudeSchema, uuidSchema } from "@/lib/validation/primitives"
import { streetViewReferenceSchema } from "@/src/locations/domain/location-view-reference.schemas"
import {
  parsePlaceShootEnvironment,
  placeShootEnvironmentSchema,
} from "@/src/places/domain/place-shoot-environment"

export const placeContributeDraftSchema = z.object({
  fictionId: uuidSchema,
  cityId: uuidSchema,
  locationName: z.string().trim(),
  placeName: z.string().trim().min(1),
  formattedAddress: z.string().trim().min(1),
  latitude: z.coerce.number().pipe(latitudeSchema),
  longitude: z.coerce.number().pipe(longitudeSchema),
  description: z.string().trim().min(1),
  isLandmark: z.boolean().optional().default(false),
  locationType: z.string().nullable().optional(),
  shootEnvironment: placeShootEnvironmentSchema.nullable().optional(),
  streetViewReference: streetViewReferenceSchema.nullable().optional(),
})

export type PlaceContributeDraft = z.infer<typeof placeContributeDraftSchema>

function parseStreetViewReferenceField(raw: FormDataEntryValue | null): unknown {
  if (raw == null) return null
  const str = String(raw).trim()
  if (!str || str === "null") return null
  try {
    return JSON.parse(str)
  } catch {
    return undefined
  }
}

export function parsePlaceContributeFormData(formData: FormData): {
  success: true
  data: PlaceContributeDraft
  imageFile: File | null
  huntId: string | null
  placeIndex: number | null
} | {
  success: false
  error: string
} {
  const raw = {
    fictionId: String(formData.get("fictionId") ?? ""),
    cityId: String(formData.get("cityId") ?? ""),
    locationName: String(formData.get("locationName") ?? ""),
    placeName: String(formData.get("placeName") ?? ""),
    formattedAddress: String(formData.get("formattedAddress") ?? ""),
    latitude: formData.get("latitude"),
    longitude: formData.get("longitude"),
    description: String(formData.get("description") ?? ""),
    isLandmark: formData.get("isLandmark") === "true",
    locationType: String(formData.get("locationType") ?? "") || null,
    shootEnvironment: parsePlaceShootEnvironment(formData.get("shootEnvironment")),
    streetViewReference: parseStreetViewReferenceField(formData.get("streetViewReference")),
  }
  const parsed = placeContributeDraftSchema.safeParse(raw)
  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message ?? "Invalid form data"
    return { success: false, error: first }
  }
  const imageRaw = formData.get("imageFile")
  const imageFile = imageRaw instanceof File && imageRaw.size > 0 ? imageRaw : null

  const huntIdRaw = String(formData.get("huntId") ?? "").trim()
  const huntId = uuidSchema.safeParse(huntIdRaw).success ? huntIdRaw : null
  const placeIndexRaw = formData.get("placeIndex")
  const placeIndexParsed =
    placeIndexRaw != null && String(placeIndexRaw).trim() !== ""
      ? Number.parseInt(String(placeIndexRaw), 10)
      : Number.NaN
  const placeIndex =
    Number.isFinite(placeIndexParsed) && placeIndexParsed >= 0 ? placeIndexParsed : null

  return { success: true, data: parsed.data, imageFile, huntId, placeIndex }
}
