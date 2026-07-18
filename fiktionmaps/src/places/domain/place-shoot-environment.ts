import { z } from "zod"

export const placeShootEnvironmentSchema = z.enum([
  "interior",
  "exterior",
  "interior_exterior",
])

export type PlaceShootEnvironment = z.infer<typeof placeShootEnvironmentSchema>

export const SHOOT_ENVIRONMENT_OPTIONS: {
  value: PlaceShootEnvironment
  labelKey:
    | "shootEnvironment_interior"
    | "shootEnvironment_exterior"
    | "shootEnvironment_interior_exterior"
}[] = [
  { value: "interior", labelKey: "shootEnvironment_interior" },
  { value: "exterior", labelKey: "shootEnvironment_exterior" },
  { value: "interior_exterior", labelKey: "shootEnvironment_interior_exterior" },
]

export function parsePlaceShootEnvironment(
  raw: unknown,
): PlaceShootEnvironment | null {
  if (raw == null || raw === "") return null
  const parsed = placeShootEnvironmentSchema.safeParse(raw)
  return parsed.success ? parsed.data : null
}
