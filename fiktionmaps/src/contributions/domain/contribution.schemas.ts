import { z } from "zod"
import { uuidSchema } from "@/lib/validation/primitives"

const contributionTypeSchema = z.enum([
  "create_fiction",
  "create_place",
  "add_scene",
  "add_photo",
  "add_place_to_scene",
  "enrich_entity",
  "correct_data",
  "mark_inaccessible",
  "add_tip",
  "checkin",
])

const contributionEntityTypeSchema = z.enum(["fiction", "place", "scene"])

const contributionOriginSchema = z.enum(["manual", "hunt"]).default("manual")

export const createContributionSchema = z.object({
  type: contributionTypeSchema,
  entityType: contributionEntityTypeSchema,
  entityId: uuidSchema,
  origin: contributionOriginSchema.optional(),
  externalId: z.string().uuid().nullable().optional(),
})

export const approveContributionSchema = z.object({
  id: uuidSchema,
  fppAwarded: z.number().int().nonnegative().optional(),
})

export const rejectContributionSchema = z.object({
  id: uuidSchema,
  moderatorNote: z.string().trim().max(5000).optional(),
})

export type CreateContributionData = z.infer<typeof createContributionSchema>
export type ApproveContributionData = z.infer<typeof approveContributionSchema>
export type RejectContributionData = z.infer<typeof rejectContributionSchema>

export type CreateContributionInput = CreateContributionData & { userId: string }
export type ApproveContributionInput = ApproveContributionData & { moderatorId: string }
export type RejectContributionInput = RejectContributionData & { moderatorId: string }

export const submitPlaceAddPhotoContributionSchema = z.object({
  placeId: uuidSchema,
})

export type SubmitPlaceAddPhotoContributionData = z.infer<typeof submitPlaceAddPhotoContributionSchema>

export const fictionAddPhotoTargetRoleSchema = z.enum(["cover", "banner"])

export const submitFictionAddPhotoContributionSchema = z.object({
  fictionId: uuidSchema,
  targetRole: fictionAddPhotoTargetRoleSchema,
})

export type SubmitFictionAddPhotoContributionData = z.infer<typeof submitFictionAddPhotoContributionSchema>

export const submitAddPlaceToSceneContributionSchema = z.object({
  sceneId: uuidSchema,
  placeIds: z.array(uuidSchema).min(1),
})

export type SubmitAddPlaceToSceneContributionData = z.infer<
  typeof submitAddPlaceToSceneContributionSchema
>
