/** Shared password policy for change / recovery (client + server). */

export const PASSWORD_MIN_LENGTH = 8

export type PasswordRuleError =
  | "TOO_SHORT"
  | "MISSING_UPPERCASE"
  | "MISSING_SYMBOL"

const UPPERCASE_RE = /[A-Z]/
/** Any non-letter, non-digit character counts as a symbol. */
const SYMBOL_RE = /[^A-Za-z0-9]/

export function validateNewPassword(password: string): PasswordRuleError | null {
  if (password.length < PASSWORD_MIN_LENGTH) return "TOO_SHORT"
  if (!UPPERCASE_RE.test(password)) return "MISSING_UPPERCASE"
  if (!SYMBOL_RE.test(password)) return "MISSING_SYMBOL"
  return null
}
