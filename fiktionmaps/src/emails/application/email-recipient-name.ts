/** Full label for admin logs / `name_to` snapshot. */
export function emailRecipientDisplayName(recipient: {
  fullName: string | null
  username: string | null
  email: string
}): string {
  const fromProfile = recipient.fullName?.trim() || recipient.username?.trim()
  if (fromProfile) return fromProfile
  const local = recipient.email.split("@")[0]?.trim()
  return local || "viajero"
}

/** First name only for greeting copy ("¡Hola Francisco!"). */
export function emailRecipientFirstName(recipient: {
  fullName: string | null
  username: string | null
  email: string
}): string {
  const full = recipient.fullName?.trim()
  if (full) {
    const first = full.split(/\s+/)[0]
    if (first) return first
  }
  const username = recipient.username?.trim()
  if (username) return username
  const local = recipient.email.split("@")[0]?.trim()
  return local || "viajero"
}
