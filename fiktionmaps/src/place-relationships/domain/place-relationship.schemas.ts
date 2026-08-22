import { z } from "zod"
import { uuidSchema } from "@/lib/validation/primitives"
import {
  PLACE_RELATION_KIND_DEFAULT,
  placeRelationKindSchema,
} from "@/src/places/domain/place-relation-kind"
import { placeShootEnvironmentSchema } from "@/src/places/domain/place-shoot-environment"

export const placeRelationshipTypeSchema = z.enum(["shared", "composite"])

export const getPlaceRelationshipsSchema = z.object({
  placeId: uuidSchema,
})

export const createPlaceRelationshipSchema = z.object({
  type: placeRelationshipTypeSchema,
  name: z.string().trim().min(1).max(200),
  slug: z.string().trim().min(1).max(200).optional(),
  placeIds: z.array(uuidSchema).min(2),
})

export const addPlaceRelationshipMemberSchema = z.object({
  placeRelationshipId: uuidSchema,
  placeId: uuidSchema,
})

export const removePlaceRelationshipMemberSchema = z.object({
  placeRelationshipId: uuidSchema,
  placeId: uuidSchema,
})

export const deletePlaceRelationshipSchema = z.object({
  placeRelationshipId: uuidSchema,
})

/** Clone source place into another fiction + join/create shared group. No image. */
export const clonePlaceToFictionSchema = z.object({
  sourcePlaceId: uuidSchema,
  targetFictionId: uuidSchema,
  placeName: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1),
  relationKind: placeRelationKindSchema.optional().default(PLACE_RELATION_KIND_DEFAULT),
  shootEnvironment: placeShootEnvironmentSchema.nullable().optional(),
  /** Optional group display name when creating a new shared group. Defaults to placeName. */
  relationshipName: z.string().trim().min(1).max(200).optional(),
})

export type GetPlaceRelationshipsInput = z.infer<typeof getPlaceRelationshipsSchema>
export type CreatePlaceRelationshipInput = z.infer<typeof createPlaceRelationshipSchema>
export type AddPlaceRelationshipMemberInput = z.infer<typeof addPlaceRelationshipMemberSchema>
export type RemovePlaceRelationshipMemberInput = z.infer<
  typeof removePlaceRelationshipMemberSchema
>
export type DeletePlaceRelationshipInput = z.infer<typeof deletePlaceRelationshipSchema>
export type ClonePlaceToFictionInput = z.infer<typeof clonePlaceToFictionSchema>
