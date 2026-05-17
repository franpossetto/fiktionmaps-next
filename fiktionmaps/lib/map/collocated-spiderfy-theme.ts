/** CSS custom properties read by `resolveCollocatedSpiderfyTheme` (set on a map pins wrapper or :root). */
export const MAP_SPIDERFY_CSS_VARS = {
  legColor: "--map-spiderfy-leg-color",
  legWidthPx: "--map-spiderfy-leg-width-px",
  radiusPx: "--map-spiderfy-radius-px",
  /** Extra screen px added to `radiusPx` so leaf pins sit past the center hub (×). */
  hubClearancePx: "--map-spiderfy-hub-clearance-px",
  maxLeaves: "--map-spiderfy-max-leaves",
} as const

export interface CollocatedSpiderfyTheme {
  /** Must be Mapbox-compatible: `#rgb`, `rgb()`, or `rgba()` (not CSS Color 4 `hsl(h s% l% / a)`). */
  legColor: string
  legWidthPx: number
  radiusPx: number
  /** Pixels beyond `radiusPx` for pin tips vs center (clears the collapse control). */
  hubClearancePx: number
  maxLeaves: number
}

const DEFAULT_THEME: CollocatedSpiderfyTheme = {
  legColor: "rgba(100, 100, 100, 0.75)",
  legWidthPx: 2,
  radiusPx: 52,
  hubClearancePx: 44,
  maxLeaves: 32,
}

function readCssVarNumber(root: HTMLElement, name: string, fallback: number): number {
  const raw = getComputedStyle(root).getPropertyValue(name).trim()
  if (!raw) return fallback
  const n = Number.parseFloat(raw)
  return Number.isFinite(n) ? n : fallback
}

function readCssVarString(root: HTMLElement, name: string, fallback: string): string {
  const raw = getComputedStyle(root).getPropertyValue(name).trim()
  return raw || fallback
}

/** Mapbox `line-color` / `fill-color` reject CSS Color 4 `hsl(h s% l% / a)`. */
function toMapboxColorOrFallback(raw: string, fallback: string): string {
  const t = raw.trim()
  if (!t) return fallback
  if (/^hsla?\(\s*[\d.]+\s+[\d.]+%\s+[\d.]+%\s*\//i.test(t)) return fallback
  return t
}

/**
 * Resolves spiderfy styling from CSS variables on `root` (defaults to `document.documentElement`),
 * then merges `overrides`.
 */
export function resolveCollocatedSpiderfyTheme(
  overrides?: Partial<CollocatedSpiderfyTheme>,
  root: HTMLElement | null = typeof document !== "undefined" ? document.documentElement : null,
): CollocatedSpiderfyTheme {
  if (!root) {
    const merged = { ...DEFAULT_THEME, ...overrides }
    merged.legColor = toMapboxColorOrFallback(merged.legColor, DEFAULT_THEME.legColor)
    return merged
  }
  const base: CollocatedSpiderfyTheme = {
    legColor: toMapboxColorOrFallback(
      readCssVarString(root, MAP_SPIDERFY_CSS_VARS.legColor, DEFAULT_THEME.legColor),
      DEFAULT_THEME.legColor,
    ),
    legWidthPx: readCssVarNumber(root, MAP_SPIDERFY_CSS_VARS.legWidthPx, DEFAULT_THEME.legWidthPx),
    radiusPx: readCssVarNumber(root, MAP_SPIDERFY_CSS_VARS.radiusPx, DEFAULT_THEME.radiusPx),
    hubClearancePx: readCssVarNumber(
      root,
      MAP_SPIDERFY_CSS_VARS.hubClearancePx,
      DEFAULT_THEME.hubClearancePx,
    ),
    maxLeaves: readCssVarNumber(root, MAP_SPIDERFY_CSS_VARS.maxLeaves, DEFAULT_THEME.maxLeaves),
  }
  const merged = { ...base, ...overrides }
  merged.legColor = toMapboxColorOrFallback(merged.legColor, DEFAULT_THEME.legColor)
  return merged
}
