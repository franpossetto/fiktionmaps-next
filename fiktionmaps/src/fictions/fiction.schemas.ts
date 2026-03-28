import { z } from "zod"

/** Use with `zodResolver(createFictionFormSchema)` when migrating admin forms to react-hook-form. */
export const createFictionFormSchema = z
  .object({
    title: z.string().trim().min(1),
    type: z.enum(["movie", "book", "tv-series"]),
    year: z.coerce.number().int().min(1900).refine((y) => y <= new Date().getFullYear(), "Invalid year"),
    genre: z.string().trim().min(1),
    synopsis: z.string().trim().min(1),
    active: z.boolean(),
    runtimeMinutes: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.type === "movie" || data.type === "tv-series") {
      const raw = data.runtimeMinutes.trim()
      if (raw !== "") {
        const n = parseInt(raw, 10)
        if (Number.isNaN(n) || n <= 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Runtime must be a positive number of minutes",
            path: ["runtimeMinutes"],
          })
        }
      }
    }
  })
  .transform((data) => {
    let duration_sec: number | null = null
    if (data.type === "movie" || data.type === "tv-series") {
      const raw = data.runtimeMinutes.trim()
      if (raw !== "") {
        duration_sec = parseInt(raw, 10) * 60
      }
    }
    if (data.type === "book") duration_sec = null
    return {
      title: data.title,
      type: data.type,
      year: data.year,
      author: null as string | null,
      genre: data.genre,
      description: data.synopsis,
      active: data.active,
      duration_sec,
    }
  })

export type CreateFictionData = z.infer<typeof createFictionFormSchema>

export const updateFictionFormSchema = z
  .object({
    title: z.string().trim().min(1),
    type: z.enum(["movie", "book", "tv-series"]),
    year: z.coerce.number().int().min(1900).refine((y) => y <= new Date().getFullYear(), "Invalid year"),
    genre: z.string().trim().min(1),
    synopsis: z.string().trim().min(1),
    author: z.preprocess((v) => (v == null ? "" : String(v)), z.string()),
    director: z.preprocess((v) => (v == null ? "" : String(v)), z.string()),
    active: z.boolean(),
    runtimeMinutes: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.type === "movie" || data.type === "tv-series") {
      const raw = data.runtimeMinutes.trim()
      if (raw !== "") {
        const n = parseInt(raw, 10)
        if (Number.isNaN(n) || n <= 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Runtime must be a positive number of minutes",
            path: ["runtimeMinutes"],
          })
        }
      }
    }
  })
  .transform((data) => {
    let duration_sec: number | null = null
    if (data.type === "movie" || data.type === "tv-series") {
      const raw = data.runtimeMinutes.trim()
      if (raw !== "") {
        duration_sec = parseInt(raw, 10) * 60
      }
    }
    return {
      title: data.title,
      type: data.type,
      year: data.year,
      author: data.type === "movie" ? data.director.trim() || null : data.author.trim() || null,
      genre: data.genre,
      description: data.synopsis,
      active: data.active,
      duration_sec,
    }
  })

/** Full payload from the admin edit form; repository/service accept partial updates. */
export type FictionFormUpdatePayload = z.infer<typeof updateFictionFormSchema>

export type UpdateFictionData = Partial<FictionFormUpdatePayload>

export function parseCreateFictionFormData(formData: FormData) {
  return createFictionFormSchema.safeParse({
    title: String(formData.get("title") ?? ""),
    type: String(formData.get("type") ?? ""),
    year: String(formData.get("year") ?? ""),
    genre: String(formData.get("genre") ?? ""),
    synopsis: String(formData.get("synopsis") ?? ""),
    active: formData.get("active") !== "false",
    runtimeMinutes: String(formData.get("runtimeMinutes") ?? ""),
  })
}

export function parseUpdateFictionFormData(formData: FormData) {
  return updateFictionFormSchema.safeParse({
    title: String(formData.get("title") ?? ""),
    type: String(formData.get("type") ?? ""),
    year: String(formData.get("year") ?? ""),
    genre: String(formData.get("genre") ?? ""),
    synopsis: String(formData.get("synopsis") ?? ""),
    author: formData.get("author"),
    director: formData.get("director"),
    active: formData.get("active") !== "false",
    runtimeMinutes: String(formData.get("runtimeMinutes") ?? ""),
  })
}
