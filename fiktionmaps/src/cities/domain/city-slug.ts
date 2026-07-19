import { generateSlug } from "@/src/fictions/domain/fiction-slug"

/** URL-safe segment; falls back to "city" when name/country have no Latin chars. */
export function slugSegment(value: string): string {
  return generateSlug(value.trim()) ?? "city"
}

/**
 * Preferred public city slug candidates, in order:
 * 1. `{city}-{country}`
 * 2. `{city}-{region}-{country}` (only if region present)
 * then callers append `-2`, `-3`, …
 */
export function citySlugCandidates(input: {
  name: string
  country: string
  region?: string | null
}): string[] {
  const city = slugSegment(input.name)
  const country = slugSegment(input.country)
  const base = `${city}-${country}`
  const region = input.region?.trim() ? slugSegment(input.region) : null
  if (region && region !== "city" && region !== country && region !== city) {
    return [base, `${city}-${region}-${country}`]
  }
  return [base]
}

/** First unused candidate, then `-2`, `-3`, … against an existing slug set. */
export function resolveUniqueCitySlug(candidates: string[], existingSlugs: string[]): string {
  const taken = new Set(existingSlugs)
  for (const candidate of candidates) {
    if (!taken.has(candidate)) return candidate
  }
  const last = candidates[candidates.length - 1] ?? "city"
  let n = 2
  while (taken.has(`${last}-${n}`)) n++
  return `${last}-${n}`
}

const CITY_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function isValidCitySlug(slug: string): boolean {
  return CITY_SLUG_PATTERN.test(slug) && slug.length >= 2 && slug.length <= 120
}

export function normalizeCitySlugInput(raw: string): string | null {
  const generated = generateSlug(raw.trim())
  if (!generated || !isValidCitySlug(generated)) return null
  return generated
}
