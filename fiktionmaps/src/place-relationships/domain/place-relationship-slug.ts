import { randomUUID } from "crypto"
import { generateSlug } from "@/src/fictions/domain/fiction-slug"

/** Base slug for a place relationship group from its display name. */
export function slugBaseFromRelationshipName(name: string): string {
  const fromName = generateSlug(name.trim())
  if (fromName) return fromName
  return randomUUID().replace(/-/g, "")
}

/** Unique across all place_relationships.slug. */
export function resolveUniqueRelationshipSlug(base: string, existingSlugs: string[]): string {
  if (!existingSlugs.includes(base)) return base
  let counter = 2
  while (existingSlugs.includes(`${base}-${counter}`)) counter++
  return `${base}-${counter}`
}
