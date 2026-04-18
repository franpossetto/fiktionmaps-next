import { z } from "zod"

/** Standard UUID string (matches DB / Supabase ids). */
export const uuidSchema = z.string().uuid()

/** Boolean guard for filtering lists (avoids repeating `safeParse` at call sites). */
export function isUuidString(value: string): boolean {
  return uuidSchema.safeParse(value).success
}

export const latitudeSchema = z.number().gte(-90).lte(90)
export const longitudeSchema = z.number().gte(-180).lte(180)

/** Query or path param: absent, empty, or a valid UUID. */
export const optionalUuidQuerySchema = z
  .union([z.string(), z.undefined(), z.null()])
  .transform((v) => {
    if (v == null) return undefined
    const t = String(v).trim()
    return t === "" ? undefined : t
  })
  .pipe(z.union([uuidSchema, z.undefined()]))
