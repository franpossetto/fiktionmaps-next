/**
 * Recovery magic-links mint a session whose JWT `amr` includes `{ method: "recovery" }`.
 * Password reset via email must only succeed for those sessions — never for a normal login.
 */

type AmrEntry = { method?: string }

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/")
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "=",
  )
  if (typeof atob === "function") {
    return atob(padded)
  }
  // Node / server actions
  return Buffer.from(value, "base64url").toString("utf8")
}

function decodeJwtPayload(accessToken: string): { amr?: AmrEntry[] } | null {
  try {
    const payloadPart = accessToken.split(".")[1]
    if (!payloadPart) return null
    return JSON.parse(decodeBase64Url(payloadPart)) as { amr?: AmrEntry[] }
  } catch {
    return null
  }
}

export function accessTokenHasRecoveryAmr(accessToken: string): boolean {
  const payload = decodeJwtPayload(accessToken)
  return Array.isArray(payload?.amr) && payload.amr.some((m) => m.method === "recovery")
}
