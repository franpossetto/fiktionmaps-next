export type MapBbox = { west: number; south: number; east: number; north: number }

export function parseFictionIdsFromSearchParams(searchParams: URLSearchParams): string[] {
  const ids = searchParams.getAll("fictionIds[]")
  if (ids.length) return ids.filter(Boolean)
  const csv = searchParams.get("fictionIds")
  if (!csv) return []
  return csv
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
}

export function parseMapBboxFromSearchParams(searchParams: URLSearchParams): MapBbox | null {
  const bbox = searchParams.get("bbox")
  if (!bbox) return null
  const parts = bbox.split(",").map((p) => parseFloat(p.trim()))
  if (parts.length !== 4) return null
  const [west, south, east, north] = parts
  if (![west, south, east, north].every((n) => Number.isFinite(n))) return null
  return { west, south, east, north }
}
