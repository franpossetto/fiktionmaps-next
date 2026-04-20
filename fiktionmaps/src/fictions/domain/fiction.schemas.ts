import { z } from "zod"

const slugField = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Only lowercase letters, numbers and hyphens")
  .nullable()

export const createFictionFormSchema = z.object({
  title: z.string().trim().min(1),
  type: z.enum(["movie", "book", "tv-series"]),
  year: z.coerce.number().int().min(1900).refine((y) => y <= new Date().getFullYear(), "Invalid year"),
  genre: z.string().trim().min(1),
  description: z.string().trim().min(1),
  active: z.boolean(),
  duration_sec: z.number().nullable(),
  author: z.string().nullable(),
  slug: slugField,
})

export const updateFictionFormSchema = z.object({
  title: z.string().trim().min(1),
  type: z.enum(["movie", "book", "tv-series"]),
  year: z.coerce.number().int().min(1900).refine((y) => y <= new Date().getFullYear(), "Invalid year"),
  genre: z.string().trim().min(1),
  description: z.string().trim().min(1),
  author: z.string().nullable(),
  active: z.boolean(),
  duration_sec: z.number().nullable(),
  slug: slugField,
})

export type CreateFictionData = z.infer<typeof createFictionFormSchema>
export type FictionFormUpdatePayload = z.infer<typeof updateFictionFormSchema>
export type UpdateFictionData = Partial<FictionFormUpdatePayload>
