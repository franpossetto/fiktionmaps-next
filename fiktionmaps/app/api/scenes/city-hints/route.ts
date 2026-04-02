import { NextResponse } from "next/server"
import { parseFictionIdsFromSearchParams } from "@/lib/validation/map-query"
import { isUuidString } from "@/lib/validation/primitives"
import { listCitiesWithActiveScenes } from "@/lib/server/scenes"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const raw = parseFictionIdsFromSearchParams(searchParams)
  const fictionIds = raw.filter(isUuidString)

  const cities = await listCitiesWithActiveScenes(fictionIds.length > 0 ? fictionIds : null)

  return NextResponse.json({ cities })
}
