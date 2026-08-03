export type AssetImageFormat =
  | "avif"
  | "webp"
  | "jpeg"
  | "png"
  | "gif"
  | "unknown"

/**
 * Infer stored format from a public asset URL (extension in path).
 * Our uploads use `{variant}_{ts}.avif` / `.webp`.
 */
export function detectAssetImageFormatFromUrl(
  url: string | null | undefined,
): AssetImageFormat {
  if (!url?.trim()) return "unknown"
  let pathname = url.trim()
  try {
    pathname = new URL(url).pathname
  } catch {
    // relative or malformed — use raw string
  }
  const lower = pathname.toLowerCase()
  if (lower.endsWith(".avif")) return "avif"
  if (lower.endsWith(".webp")) return "webp"
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "jpeg"
  if (lower.endsWith(".png")) return "png"
  if (lower.endsWith(".gif")) return "gif"
  return "unknown"
}

export function formatAssetImageFormatLabel(format: AssetImageFormat): string {
  if (format === "unknown") return "unknown"
  return format.toUpperCase()
}
