import { MAPBOX_ACCESS_TOKEN } from "@/lib/map/mapbox/styles"

export type WishlistStayPick = {
  label: string
  lat: number
  lng: number
}

export type StayPrediction = {
  id: string
  label: string
  lat: number
  lng: number
}

export async function searchStayAddresses(
  input: string,
  proximity: { lat: number; lng: number } | null,
): Promise<StayPrediction[]> {
  if (!MAPBOX_ACCESS_TOKEN || input.trim().length < 3) return []
  const params = new URLSearchParams({
    access_token: MAPBOX_ACCESS_TOKEN,
    autocomplete: "true",
    types: "address,poi",
    limit: "6",
  })
  if (proximity) params.set("proximity", `${proximity.lng},${proximity.lat}`)
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(input.trim())}.json?${params}`
  const res = await fetch(url)
  if (!res.ok) return []
  const data = (await res.json()) as {
    features?: Array<{ id: string; place_name: string; center?: [number, number] }>
  }
  return (data.features ?? [])
    .map((feature) => {
      const center = feature.center
      if (!center || !Number.isFinite(center[0]) || !Number.isFinite(center[1])) return null
      return {
        id: feature.id,
        label: feature.place_name,
        lng: center[0],
        lat: center[1],
      }
    })
    .filter((row): row is StayPrediction => row != null)
}

export async function reverseStayAddress(
  lat: number,
  lng: number,
): Promise<string | null> {
  if (!MAPBOX_ACCESS_TOKEN) return null
  const params = new URLSearchParams({
    access_token: MAPBOX_ACCESS_TOKEN,
    types: "address,poi",
    limit: "1",
  })
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?${params}`
  const res = await fetch(url)
  if (!res.ok) return null
  const data = (await res.json()) as { features?: Array<{ place_name?: string }> }
  return data.features?.[0]?.place_name?.trim() || null
}
