import { randomUUID } from "crypto"
import { generateSlug } from "@/src/fictions/domain/fiction-slug"

/**
 * Base slug for a place from fiction display name only (never location name).
 * Falls back to a UUID without hyphens when the name has no Latin slug characters.
 */
export function slugBaseFromPlaceName(placeName: string): string {
  const fromName = generateSlug(placeName.trim())
  if (fromName) return fromName
  return randomUUID().replace(/-/g, "")
}

/** Unique within a single fiction. */
export function resolveUniquePlaceSlug(base: string, existingSlugs: string[]): string {
  if (!existingSlugs.includes(base)) return base
  let counter = 2
  while (existingSlugs.includes(`${base}-${counter}`)) counter++
  return `${base}-${counter}`
}
