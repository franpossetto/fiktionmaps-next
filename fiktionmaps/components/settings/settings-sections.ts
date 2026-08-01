export type SettingsSectionId = "appearance" | "markers" | "account"

export const SETTINGS_SECTION_IDS = [
  "appearance",
  "markers",
  "account",
] as const satisfies readonly SettingsSectionId[]

export type SettingsNavItem = {
  id: SettingsSectionId
  label: string
}
