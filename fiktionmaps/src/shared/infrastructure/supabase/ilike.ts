/** Escape `\`, `%`, and `_` so the value is a literal substring for `ilike`. */
export function ilikeContainsPattern(query: string): string | null {
  const escaped = query.trim().replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_")
  if (!escaped) return null
  return `%${escaped}%`
}
