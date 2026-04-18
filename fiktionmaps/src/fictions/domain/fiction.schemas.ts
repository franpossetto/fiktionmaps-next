import { z } from "zod"

export const createFictionFormSchema = z.object({
  title: z.string().trim().min(1),
  type: z.enum(["movie", "book", "tv-series"]),
  year: z.coerce.number().int().min(1900).refine((y) => y <= new Date().getFullYear(), "Invalid year"),
  genre: z.string().trim().min(1),
  description: z.string().trim().min(1),
  active: z.boolean(),
  duration_sec: z.number().nullable(),
  author: z.string().nullable(),
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
})

export type CreateFictionData = z.infer<typeof createFictionFormSchema>
export type FictionFormUpdatePayload = z.infer<typeof updateFictionFormSchema>
export type UpdateFictionData = Partial<FictionFormUpdatePayload>
