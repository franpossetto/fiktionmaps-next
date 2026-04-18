/**
 * Film timecode as HH:MM:SS stored in `timestamp_label`.
 * UI uses three numeric fields to avoid free-text errors.
 */

export type TimecodeParts = { h: string; m: string; s: string }

const Z = (n: number, w: number) => String(n).padStart(w, "0")

/** Parse DB label into parts for inputs (empty strings if unset). */
export function parseTimecodeLabel(label: string | null | undefined): TimecodeParts {
  if (!label?.trim()) return { h: "", m: "", s: "" }
  const t = label.trim()
  const parts = t.split(":").map((p) => p.trim())
  if (parts.length === 3) {
    const h = Math.min(99, Math.max(0, parseInt(parts[0]!, 10) || 0))
    const m = Math.min(59, Math.max(0, parseInt(parts[1]!, 10) || 0))
    const s = Math.min(59, Math.max(0, parseInt(parts[2]!, 10) || 0))
    return { h: String(h), m: String(m), s: String(s) }
  }
  if (parts.length === 2) {
    const m = Math.min(59, Math.max(0, parseInt(parts[0]!, 10) || 0))
    const s = Math.min(59, Math.max(0, parseInt(parts[1]!, 10) || 0))
    return { h: "0", m: String(m), s: String(s) }
  }
  return { h: "", m: "", s: "" }
}

/** Total seconds from a stored timecode label (e.g. for UI timelines). */
export function secondsFromTimecodeLabel(label: string | null | undefined): number | null {
  const p = parseTimecodeLabel(label)
  const hasAny = [p.h, p.m, p.s].some((x) => x.trim() !== "")
  if (!hasAny) return null
  const h = p.h.trim() === "" ? 0 : parseInt(p.h, 10) || 0
  const m = p.m.trim() === "" ? 0 : parseInt(p.m, 10) || 0
  const s = p.s.trim() === "" ? 0 : parseInt(p.s, 10) || 0
  if (![h, m, s].every((n) => Number.isFinite(n))) return null
  return h * 3600 + m * 60 + s
}

/** Build label for API; returns null if all parts empty. */
export function buildTimecodeLabel(parts: TimecodeParts): string | null {
  const hasAny = [parts.h, parts.m, parts.s].some((x) => x.trim() !== "")
  if (!hasAny) return null
  const h = parts.h.trim() === "" ? 0 : parseInt(parts.h, 10)
  const m = parts.m.trim() === "" ? 0 : parseInt(parts.m, 10)
  const s = parts.s.trim() === "" ? 0 : parseInt(parts.s, 10)
  if (![h, m, s].every((n) => Number.isFinite(n))) return null
  const hh = Math.min(99, Math.max(0, h))
  const mm = Math.min(59, Math.max(0, m))
  const ss = Math.min(59, Math.max(0, s))
  return `${Z(hh, 2)}:${Z(mm, 2)}:${Z(ss, 2)}`
}
