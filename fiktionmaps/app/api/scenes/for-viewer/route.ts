import { NextResponse } from "next/server"
import {
  parseFictionIdsFromSearchParams,
  parseMapBboxFromSearchParams,
} from "@/lib/validation/map-query"
import { isUuidString } from "@/lib/validation/primitives"
import { listScenesWithVideoInBbox } from "@/src/server/scenes"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const rawFictionIds = parseFictionIdsFromSearchParams(searchParams)
  const bbox = parseMapBboxFromSearchParams(searchParams)

  if (!bbox) {
    return NextResponse.json({ error: "Missing bbox" }, { status: 400 })
  }
  if (rawFictionIds.length === 0) {
    return NextResponse.json([])
  }

  const fictionIds = rawFictionIds.filter(isUuidString)
  if (fictionIds.length === 0) {
    return NextResponse.json([])
  }

  const clips = await listScenesWithVideoInBbox({ fictionIds, bbox })
  return NextResponse.json(clips)
}
