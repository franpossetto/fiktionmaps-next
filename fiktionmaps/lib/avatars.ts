import type { ThemeBase } from "@/lib/theme-settings"
import onboardingData from "@/data/onboarding.json"

const FALLBACK = "/logo-icon.png"

const AVATAR_IDS = new Set(
  (onboardingData.avatars as { id: string }[]).map((a) => a.id)
)

/**
 * Resolves the display src for a user avatar value stored in profiles.avatar_url.
 *
 * - Known avatar ID (e.g. "manchi") → /avatars/{theme}/manchi_{theme}.png
 * - HTTP/HTTPS URL (bucket upload)  → used as-is
 * - null / unknown / legacy DiceBear or /avatars/ paths → fallback /logo-icon.png
 */
function isLegacyAvatarValue(value: string): boolean {
  return (
    value === FALLBACK ||
    /dicebear/i.test(value) ||
    /^\/avatars\//.test(value)
  )
}

export function getAvatarSrc(value: string | null | undefined, theme: ThemeBase): string {
  if (!value || isLegacyAvatarValue(value)) return FALLBACK
  if (value.startsWith("http")) return value
  if (AVATAR_IDS.has(value)) return `/avatars/${theme}/${value}_${theme}.png`
  return FALLBACK
}
