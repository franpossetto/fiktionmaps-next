import { NextResponse } from "next/server"
import {
  parseFictionIdsFromSearchParams,
  parseMapBboxFromSearchParams,
} from "@/lib/validation/map-query"
import { isUuidString } from "@/lib/validation/primitives"
import { listScenesWithVideoInBbox, listScenesWithVideoInCity } from "@/lib/server/scenes"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const rawFictionIds = parseFictionIdsFromSearchParams(searchParams)

  if (rawFictionIds.length === 0) {
    return NextResponse.json([])
  }

  const fictionIds = rawFictionIds.filter(isUuidString)
  if (fictionIds.length === 0) {
    return NextResponse.json([])
  }

  const cityIdRaw = searchParams.get("cityId")
  if (cityIdRaw && isUuidString(cityIdRaw)) {
    const clips = await listScenesWithVideoInCity({ fictionIds, cityId: cityIdRaw })
    return NextResponse.json(clips)
  }

  const bbox = parseMapBboxFromSearchParams(searchParams)
  if (!bbox) {
    return NextResponse.json({ error: "Missing bbox or valid cityId" }, { status: 400 })
  }

  const clips = await listScenesWithVideoInBbox({ fictionIds, bbox })
  return NextResponse.json(clips)
}
