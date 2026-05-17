import { z } from "zod"

/** Segment the user enters after the fixed title URL (format: `tt` + digits). */
export function isValidImdbTitleIdSegment(raw: string): boolean {
  const s = raw.trim()
  if (!s) return true
  return /^tt\d{7,}$/i.test(s)
}

/** Empty or whitespace-only input is valid (optional field). Accepts plain tt… or full URL. */
export function isValidImdbUserInput(raw: string): boolean {
  const s = raw.trim()
  if (!s) return true
  if (/^tt\d{7,}$/i.test(s)) return true
  return /tt\d{7,}/i.test(s)
}

/** Returns normalized tt… id or null when input is empty. */
export function normalizeImdbUserInput(raw: string): string | null {
  const s = raw.trim()
  if (!s) return null
  if (/^tt\d{7,}$/i.test(s)) return s.toLowerCase()
  const m = s.match(/tt\d{7,}/i)
  return m ? m[0].toLowerCase() : null
}

export const imdbExternalIdFormField = z
  .string()
  .optional()
  .transform((v) => (v == null ? "" : v.trim()))
  .superRefine((s, ctx) => {
    if (s === "") return
    if (!isValidImdbUserInput(s)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Paste a valid IMDb title URL or tt ID." })
    }
  })
  .transform((s) => normalizeImdbUserInput(s))
