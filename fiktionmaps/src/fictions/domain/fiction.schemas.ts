import { z } from "zod"
import { FICTION_LANGUAGE_CODES } from "@/lib/constants/fiction-languages"

const slugField = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Only lowercase letters, numbers and hyphens")

export const fictionLanguageCodeSchema = z.enum(FICTION_LANGUAGE_CODES)

/** Matches `public.contribution_status` on fictions / places / scenes. */
export const fictionRowStatusSchema = z.enum(["pending", "approved", "rejected"])

export const createFictionFormSchema = z.object({
  title: z.string().trim().min(1),
  type: z.enum(["movie", "book", "tv-series"]),
  year: z.coerce.number().int().min(1900).refine((y) => y <= new Date().getFullYear(), "Invalid year"),
  genre: z.string().trim().min(1),
  description: z.string().trim().min(1),
  active: z.boolean(),
  duration_sec: z.number().nullable(),
  slug: slugField,
  /** Denormalized primary credit (director/author); set on INSERT so contributors don't need UPDATE. */
  author: z.string().trim().nullable().optional(),
  status: fictionRowStatusSchema.optional(),
  created_by: z.string().uuid().optional(),
  original_language: fictionLanguageCodeSchema,
  content_language: fictionLanguageCodeSchema,
})

export const updateFictionFormSchema = z.object({
  title: z.string().trim().min(1),
  type: z.enum(["movie", "book", "tv-series"]),
  year: z.coerce.number().int().min(1900).refine((y) => y <= new Date().getFullYear(), "Invalid year"),
  genre: z.string().trim().min(1),
  description: z.string().trim().min(1),
  active: z.boolean(),
  duration_sec: z.number().nullable(),
  slug: slugField,
  author: z.string().trim().nullable().optional(),
  original_language: fictionLanguageCodeSchema.nullable().optional(),
  content_language: fictionLanguageCodeSchema.nullable().optional(),
})

export type CreateFictionData = z.infer<typeof createFictionFormSchema>
export type FictionFormUpdatePayload = z.infer<typeof updateFictionFormSchema>
export type UpdateFictionData = Partial<FictionFormUpdatePayload>
