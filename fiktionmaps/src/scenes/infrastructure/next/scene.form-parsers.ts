import { z } from "zod"
import { optionalUuidQuerySchema } from "@/lib/validation/primitives"

/** Parses HTTP query string params for the scenes list action/route. */
export const listScenesQuerySchema = z.object({
  fictionId: optionalUuidQuerySchema,
  placeId: optionalUuidQuerySchema,
  locationId: optionalUuidQuerySchema,
  active: z
    .union([z.literal("true"), z.literal("false"), z.string(), z.null(), z.undefined()])
    .optional()
    .transform((v) => {
      if (v === "true") return true
      if (v === "false") return false
      return undefined
    }),
})
