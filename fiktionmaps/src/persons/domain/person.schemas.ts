import { z } from "zod"

export const createPersonSchema = z.object({
  name: z.string().trim().min(1),
  bio: z.string().trim().nullable().optional(),
  photo_url: z.string().url().nullable().optional(),
  birth_year: z.number().int().min(1800).max(new Date().getFullYear()).nullable().optional(),
  nationality: z.string().trim().nullable().optional(),
})

export const fictionPersonEntrySchema = z.object({
  person_id: z.string().uuid(),
  role: z.string().trim().min(1),
  sort_order: z.number().int().min(0).optional(),
})

export type CreatePersonData = z.infer<typeof createPersonSchema>
export type FictionPersonEntry = z.infer<typeof fictionPersonEntrySchema>
