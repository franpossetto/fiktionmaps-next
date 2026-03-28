import { NextResponse } from "next/server"
import { createAnonymousClient } from "@/lib/supabase/server"
import { isUuidString } from "@/lib/validation/primitives"
import type { Location } from "@/src/locations"

function parseFictionIds(searchParams: URLSearchParams): string[] {
  const ids = searchParams.getAll("fictionIds[]")
  if (ids.length) return ids.filter(Boolean)
  const csv = searchParams.get("fictionIds")
  if (!csv) return []
  return csv
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
}

function parseBbox(searchParams: URLSearchParams): {
  west: number
  south: number
  east: number
  north: number
} | null {
  const bbox = searchParams.get("bbox")
  if (!bbox) return null
  const parts = bbox.split(",").map((p) => parseFloat(p.trim()))
  if (parts.length !== 4) return null
  const [west, south, east, north] = parts
  if (![west, south, east, north].every((n) => Number.isFinite(n))) return null
  return { west, south, east, north }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const rawFictionIds = parseFictionIds(searchParams)
  const bbox = parseBbox(searchParams)

  if (!bbox) {
    return NextResponse.json({ error: "Missing bbox" }, { status: 400 })
  }
  if (rawFictionIds.length === 0) {
    return NextResponse.json([] satisfies Location[])
  }

  // places.fiction_id is UUID; passing slugs (e.g. from mock data) causes Postgres to throw.
  const fictionIds = rawFictionIds.filter(isUuidString)
  if (fictionIds.length === 0) {
    return NextResponse.json([] satisfies Location[])
  }

  const supabase = createAnonymousClient()

  // 1) Get location IDs inside the viewport (avoids nested-table filter issues).
  const { data: locationRows, error: locError } = await supabase
    .from("locations")
    .select("id")
    .gte("latitude", bbox.south)
    .lte("latitude", bbox.north)
    .gte("longitude", bbox.west)
    .lte("longitude", bbox.east)

  if (locError) {
    return NextResponse.json({ error: locError.message }, { status: 500 })
  }

  const locationIds = (locationRows ?? []).map((r) => r.id).filter(Boolean)
  if (locationIds.length === 0) {
    return NextResponse.json([] satisfies Location[])
  }

  // 2) Get places for those locations and selected fictions (inner join locations for embed).
  const { data: rows, error } = await supabase
    .from("places")
    .select(
      `
        id,
        fiction_id,
        description,
        active,
        location:locations!inner (
          id,
          name,
          formatted_address,
          latitude,
          longitude,
          city_id,
          is_landmark
        )
      `,
    )
    .in("fiction_id", fictionIds)
    .in("location_id", locationIds)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Fetch avatar images for returned places (pins).
  const placeIds = (rows ?? []).map((r) => r.id as string)
  const { data: avatarRows } = await supabase
    .from("asset_images")
    .select("entity_id, url")
    .eq("entity_type", "place")
    .eq("role", "avatar")
    .eq("variant", "sm")
    .in("entity_id", placeIds)

  const avatarByPlaceId = new Map<string, string>()
  for (const r of avatarRows ?? []) {
    if (r.entity_id && r.url) avatarByPlaceId.set(r.entity_id as string, r.url as string)
  }

  const result: Location[] = (rows ?? []).map((r: any) => {
    const loc = r.location
    const placeId = r.id as string
    return {
      id: placeId,
      name: loc?.name ?? "Unknown place",
      address: loc?.formatted_address ?? "",
      lat: loc?.latitude ?? 0,
      lng: loc?.longitude ?? 0,
      cityId: loc?.city_id ?? "",
      fictionId: r.fiction_id ?? "",
      image: avatarByPlaceId.get(placeId) ?? "/placeholder.svg",
      videoUrl: "",
      description: r.description ?? "",
      sceneDescription: "",
      sceneQuote: undefined,
      visitTip: undefined,
    }
  })

  return NextResponse.json(result)
}

