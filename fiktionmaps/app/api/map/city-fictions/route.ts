import { NextResponse } from "next/server"
import { createAnonymousClient } from "@/lib/supabase/server"
import { uuidSchema } from "@/lib/validation/primitives"
import {
  mapAssetImagesToFiction,
  type AssetImageRow,
} from "@/src/fictions/fiction-cached-read"
import type { FictionWithMedia } from "@/src/fictions/fiction.domain"

/** GET: fictions that have at least one place in the given city (for map selector). */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const cityId = searchParams.get("cityId")
  if (!cityId || !uuidSchema.safeParse(cityId).success) {
    return NextResponse.json({ error: "Valid cityId is required" }, { status: 400 })
  }

  const supabase = createAnonymousClient()

  // 1) Location ids in this city
  const { data: locationRows, error: locError } = await supabase
    .from("locations")
    .select("id")
    .eq("city_id", cityId)

  if (locError) {
    return NextResponse.json({ error: locError.message }, { status: 500 })
  }

  const locationIds = (locationRows ?? []).map((r) => r.id).filter(Boolean)
  if (locationIds.length === 0) {
    return NextResponse.json([] satisfies FictionWithMedia[])
  }

  // 2) Distinct fiction_ids from places in those locations
  const { data: placeRows, error: placeError } = await supabase
    .from("places")
    .select("fiction_id")
    .in("location_id", locationIds)

  if (placeError) {
    return NextResponse.json({ error: placeError.message }, { status: 500 })
  }

  const fictionIds = [...new Set((placeRows ?? []).map((r) => r.fiction_id).filter(Boolean))]
  if (fictionIds.length === 0) {
    return NextResponse.json([] satisfies FictionWithMedia[])
  }

  // 3) Load fictions and their cover images
  const { data: fictionsData, error: fError } = await supabase
    .from("fictions")
    .select("*")
    .in("id", fictionIds)
    .order("title")

  if (fError || !fictionsData?.length) {
    return NextResponse.json((fictionsData ?? []) as FictionWithMedia[])
  }

  const ids = fictionsData.map((f) => f.id)
  const { data: imagesData } = await supabase
    .from("asset_images")
    .select("entity_id, role, variant, url")
    .eq("entity_type", "fiction")
    .in("entity_id", ids)

  const imagesByEntity = new Map<string, AssetImageRow[]>()
  for (const row of imagesData ?? []) {
    const list = imagesByEntity.get(row.entity_id) ?? []
    list.push(row as AssetImageRow)
    imagesByEntity.set(row.entity_id, list)
  }

  const fictions: FictionWithMedia[] = fictionsData.map((f) =>
    mapAssetImagesToFiction(f, imagesByEntity.get(f.id) ?? [])
  )

  return NextResponse.json(fictions)
}
