import { z } from "zod"
import { latitudeSchema, longitudeSchema, uuidSchema } from "@/lib/validation/primitives"

export const createPlaceSchema = z.object({
  fictionId: uuidSchema,
  cityId: uuidSchema,
  name: z.string().trim().min(1),
  formattedAddress: z.string().trim(),
  latitude: z.coerce.number().pipe(latitudeSchema),
  longitude: z.coerce.number().pipe(longitudeSchema),
  description: z.string().trim().min(1),
  isLandmark: z.boolean().optional(),
  locationType: z.string().nullable().optional(),
})

export const updatePlaceSchema = createPlaceSchema

export type CreatePlaceData = z.infer<typeof createPlaceSchema>
export type UpdatePlaceData = z.infer<typeof updatePlaceSchema>
