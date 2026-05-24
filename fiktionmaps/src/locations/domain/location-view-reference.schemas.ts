import { z } from "zod"
import { latitudeSchema, longitudeSchema } from "@/lib/validation/primitives"

/** UI / form draft shape (Google Street View picker). */
export const streetViewReferenceSchema = z.object({
  latitude: latitudeSchema,
  longitude: longitudeSchema,
  heading: z.number().min(0).max(360),
  pitch: z.number().min(-90).max(90),
  fov: z.number().min(10).max(120),
  panoId: z.string().trim().min(1).nullable().optional(),
})

export type StreetViewReference = z.infer<typeof streetViewReferenceSchema>

export const LOCATION_VIEW_REFERENCE_PROVIDER = {
  googleStreetView: "google_street_view",
} as const

export type LocationViewReferenceProvider =
  (typeof LOCATION_VIEW_REFERENCE_PROVIDER)[keyof typeof LOCATION_VIEW_REFERENCE_PROVIDER]
