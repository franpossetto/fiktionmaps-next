export type SettingsSectionId = "appearance" | "markers"

export const SETTINGS_SECTION_IDS = ["appearance", "markers"] as const satisfies readonly SettingsSectionId[]

export type SettingsNavItem = {
  id: SettingsSectionId
  label: string
}
