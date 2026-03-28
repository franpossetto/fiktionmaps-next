import { z } from "zod"
import { uuidSchema } from "./primitives"

export const toggleFictionLikeBodySchema = z.object({
  fictionId: z.preprocess((v) => (typeof v === "string" ? v.trim() : v), uuidSchema),
})

export const interestIdsBodySchema = z.object({
  interestIds: z.array(z.preprocess((v) => (typeof v === "string" ? v.trim() : v), uuidSchema)),
})
