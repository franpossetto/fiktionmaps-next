import type { AuthPasswordErrorCode } from "./auth.types"

const PASSWORD_ERROR_CODES = new Set<string>([
  "UNAUTHORIZED",
  "INVALID_CURRENT_PASSWORD",
  "WEAK_PASSWORD",
  "TOO_SHORT",
  "MISSING_UPPERCASE",
  "MISSING_SYMBOL",
  "SAME_PASSWORD",
  "UPDATE_FAILED",
  "RATE_LIMITED",
  "NOT_RECOVERY_SESSION",
  "MISMATCH",
])

export function isPasswordErrorCode(value: string): value is AuthPasswordErrorCode | "MISMATCH" {
  return PASSWORD_ERROR_CODES.has(value)
}
