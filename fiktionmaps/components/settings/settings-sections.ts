export type SettingsSectionId = "account" | "appearance" | "markers"

export const SETTINGS_SECTION_IDS = [
  "account",
  "appearance",
  "markers",
] as const satisfies readonly SettingsSectionId[]

export type SettingsNavItem = {
  id: SettingsSectionId
  label: string
}

/** Resolved after hydration: locale and timezone are only known on the client. */
export type LocalClock = {
  time: string
  timeZone: string
}
