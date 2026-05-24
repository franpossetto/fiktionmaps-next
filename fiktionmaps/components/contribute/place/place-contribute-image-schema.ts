/** Same wide hero as `FictionPlaceDetailView` (`aspect-[21/9]`). */
export const PLACE_HERO_ASPECT_WIDTH_OVER_HEIGHT = 21 / 9

export const PLACE_HERO_ASPECT_RATIO_TOLERANCE = 0.1

export function isPlaceHeroAspectRatioOk(width: number, height: number): boolean {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return false
  const actual = width / height
  const target = PLACE_HERO_ASPECT_WIDTH_OVER_HEIGHT
  return Math.abs(actual - target) / target <= PLACE_HERO_ASPECT_RATIO_TOLERANCE
}

export const PLACE_HERO_READABLE_MIN_SHORT_EDGE_PX = 360

export function isPlaceHeroReadableResolutionOk(width: number, height: number): boolean {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return false
  return Math.min(width, height) >= PLACE_HERO_READABLE_MIN_SHORT_EDGE_PX
}

const MAX_IMAGE_BYTES = 10 * 1024 * 1024
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"]

export function validatePlaceContributeImageFile(
  file: File,
  messages: { imageFormatInvalid: string; imageTooLarge: string },
): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return messages.imageFormatInvalid
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return messages.imageTooLarge
  }
  return null
}
