export type ImageFocus = {
  x: number
  y: number
}

export const DEFAULT_IMAGE_FOCUS: ImageFocus = { x: 50, y: 50 }

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 50
  return Math.min(100, Math.max(0, value))
}

export function normalizeImageFocus(
  x: number | null | undefined,
  y: number | null | undefined,
): ImageFocus {
  return {
    x: clampPercent(x ?? DEFAULT_IMAGE_FOCUS.x),
    y: clampPercent(y ?? DEFAULT_IMAGE_FOCUS.y),
  }
}

export function isDefaultImageFocus(focus: ImageFocus): boolean {
  return focus.x === DEFAULT_IMAGE_FOCUS.x && focus.y === DEFAULT_IMAGE_FOCUS.y
}

export function imageFocusToObjectPosition(focus: ImageFocus | null | undefined): string {
  const f = focus ? normalizeImageFocus(focus.x, focus.y) : DEFAULT_IMAGE_FOCUS
  return `${f.x}% ${f.y}%`
}

/** Read focus coords from FormData. Optional prefix → `{prefix}FocusX` / `{prefix}FocusY` (e.g. "cover"). */
export function parseImageFocusFromFormData(formData: FormData, prefix?: string): ImageFocus {
  const xKey = prefix ? `${prefix}FocusX` : "focusX"
  const yKey = prefix ? `${prefix}FocusY` : "focusY"
  const snakeX = prefix ? `${prefix}_focus_x` : "focus_x"
  const snakeY = prefix ? `${prefix}_focus_y` : "focus_y"
  const rawX = formData.get(xKey) ?? formData.get(snakeX)
  const rawY = formData.get(yKey) ?? formData.get(snakeY)
  const x = typeof rawX === "string" && rawX.trim() !== "" ? Number(rawX) : DEFAULT_IMAGE_FOCUS.x
  const y = typeof rawY === "string" && rawY.trim() !== "" ? Number(rawY) : DEFAULT_IMAGE_FOCUS.y
  return normalizeImageFocus(x, y)
}
