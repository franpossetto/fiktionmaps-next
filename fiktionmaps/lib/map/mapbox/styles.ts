export const MAPBOX_ACCESS_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || ""

// 4 Mapbox style URLs: day, dawn, dusk, night
export const MAPBOX_DAY_STYLE = process.env.NEXT_PUBLIC_MAPBOX_STYLE_DAY_URL || "mapbox://styles/mapbox/light-v11"
export const MAPBOX_DAWN_STYLE = process.env.NEXT_PUBLIC_MAPBOX_STYLE_DAWN_URL || process.env.NEXT_PUBLIC_MAPBOX_STYLE_DAY_URL || "mapbox://styles/mapbox/light-v11"
export const MAPBOX_DUSK_STYLE = process.env.NEXT_PUBLIC_MAPBOX_STYLE_DUSK_URL || process.env.NEXT_PUBLIC_MAPBOX_STYLE_NIGHT_URL || "mapbox://styles/mapbox/dark-v11"
export const MAPBOX_NIGHT_STYLE = process.env.NEXT_PUBLIC_MAPBOX_STYLE_NIGHT_URL || "mapbox://styles/mapbox/dark-v11"

/** @deprecated use MAPBOX_DAY_STYLE */
export const MAPBOX_LIGHT_STYLE = MAPBOX_DAY_STYLE
/** @deprecated use MAPBOX_NIGHT_STYLE */
export const MAPBOX_DARK_STYLE = MAPBOX_NIGHT_STYLE
