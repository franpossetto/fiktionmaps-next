import { z } from "zod"

/** Use with `zodResolver(cityWriteSchema)` when migrating city forms to react-hook-form. */
export const cityWriteSchema = z.object({
  name: z.string().trim().min(1),
  country: z.string().trim().min(1),
  lat: z.coerce.number().refine((n) => n >= -90 && n <= 90, "Invalid latitude"),
  lng: z.coerce.number().refine((n) => n >= -180 && n <= 180, "Invalid longitude"),
  zoom: z.coerce.number().int().min(0).max(22),
})

export type CreateCityData = z.infer<typeof cityWriteSchema>

export type UpdateCityData = Partial<CreateCityData>
