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
