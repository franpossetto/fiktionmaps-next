import { NextResponse } from "next/server"
import { createAnonymousClient } from "@/lib/supabase/server"
import { isUuidString } from "@/lib/validation/primitives"
import type { Location } from "@/src/locations"

export async function GET(req: Request) {
  const placeId = new URL(req.url).searchParams.get("placeId")
  if (!placeId || !isUuidString(placeId)) {
    return NextResponse.json({ error: "Invalid placeId" }, { status: 400 })
  }

  const supabase = createAnonymousClient()

  const { data: row, error } = await supabase
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
    .eq("id", placeId)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const loc = row.location as {
    id: string
    name: string
    formatted_address: string | null
    latitude: number | null
    longitude: number | null
    city_id: string | null
    is_landmark: boolean | null
  }

  const { data: avatarRows } = await supabase
    .from("asset_images")
    .select("url")
    .eq("entity_type", "place")
    .eq("role", "avatar")
    .eq("variant", "sm")
    .eq("entity_id", placeId)
    .limit(1)

  const imageUrl = (avatarRows?.[0] as { url?: string } | undefined)?.url ?? "/placeholder.svg"

  const result: Location = {
    id: row.id as string,
    name: loc?.name ?? "Unknown place",
    address: loc?.formatted_address ?? "",
    lat: loc?.latitude ?? 0,
    lng: loc?.longitude ?? 0,
    cityId: loc?.city_id ?? "",
    fictionId: row.fiction_id as string,
    image: imageUrl,
    videoUrl: "",
    description: (row.description as string | null) ?? "",
    sceneDescription: "",
    sceneQuote: undefined,
    visitTip: undefined,
    isLandmark: loc?.is_landmark ?? undefined,
  }

  return NextResponse.json(result)
}
