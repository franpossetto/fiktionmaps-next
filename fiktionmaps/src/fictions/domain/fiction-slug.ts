/**
 * Generates a URL-friendly slug from a fiction title.
 * Returns null if the title has no Latin-compatible characters.
 */
export function generateSlug(title: string): string | null {
  const slug = title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-") // non-alphanumeric → hyphen
    .replace(/^-+|-+$/g, "") // trim edge hyphens
  return slug.length > 0 ? slug : null
}

/**
 * Given a base slug, a year, and the list of existing slugs that start with that base,
 * returns a unique slug by appending the year and/or a counter.
 */
export function resolveUniqueSlug(base: string, year: number, existingSlugs: string[]): string {
  if (!existingSlugs.includes(base)) return base
  const withYear = `${base}-${year}`
  if (!existingSlugs.includes(withYear)) return withYear
  let counter = 2
  while (existingSlugs.includes(`${withYear}-${counter}`)) counter++
  return `${withYear}-${counter}`
}
