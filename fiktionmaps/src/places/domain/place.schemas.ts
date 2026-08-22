import { z } from "zod"
import { latitudeSchema, longitudeSchema, uuidSchema } from "@/lib/validation/primitives"
import { fictionRowStatusSchema } from "@/src/fictions/domain/fiction.schemas"
import { streetViewReferenceSchema } from "@/src/locations/domain/location-view-reference.schemas"
import {
  PLACE_RELATION_KIND_DEFAULT,
  placeRelationKindSchema,
} from "@/src/places/domain/place-relation-kind"
import { placeShootEnvironmentSchema } from "@/src/places/domain/place-shoot-environment"

export const createPlaceSchema = z.object({
  fictionId: uuidSchema,
  cityId: uuidSchema,
  locationName: z.string().trim().min(1),
  placeName: z.string().trim().min(1),
  formattedAddress: z.string().trim(),
  latitude: z.coerce.number().pipe(latitudeSchema),
  longitude: z.coerce.number().pipe(longitudeSchema),
  description: z.string().trim().min(1),
  isLandmark: z.boolean().optional(),
  locationType: z.string().nullable().optional(),
  relationKind: placeRelationKindSchema.optional().default(PLACE_RELATION_KIND_DEFAULT),
  shootEnvironment: placeShootEnvironmentSchema.nullable().optional(),
  streetViewReference: streetViewReferenceSchema.nullable().optional(),
})

export const updatePlaceSchema = createPlaceSchema

export type CreatePlaceData = z.infer<typeof createPlaceSchema>
export type UpdatePlaceData = z.infer<typeof updatePlaceSchema>

/** Set in server actions from session + moderator role; not from client parsing. */
export type CreatePlaceRepoInput = CreatePlaceData & {
  status: z.infer<typeof fictionRowStatusSchema>
  created_by: string
  slug: string
}
