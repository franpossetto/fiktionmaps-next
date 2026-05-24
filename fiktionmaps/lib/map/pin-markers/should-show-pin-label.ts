import type { MapMarkerLabelMode } from "@/lib/theme-settings"

export function shouldShowPinLabel(
  labelMode: MapMarkerLabelMode | undefined,
  opts: { preview?: boolean; isSelected: boolean; isHovered: boolean },
): boolean {
  const mode = labelMode ?? "hover"
  if (opts.preview) return mode === "always"
  if (mode === "always") return true
  return opts.isSelected || opts.isHovered
}
