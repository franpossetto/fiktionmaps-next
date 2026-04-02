import { NextResponse } from "next/server"
import { uuidSchema } from "@/lib/validation/primitives"
import { getCityFictionsWithScenesForViewer } from "@/lib/server/queries"
import type { FictionWithMedia } from "@/src/fictions/fiction.domain"

/** GET: fictions with at least one active scene with video in the given city (Scenes viewer). */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const cityId = searchParams.get("cityId")
  if (!cityId || !uuidSchema.safeParse(cityId).success) {
    return NextResponse.json({ error: "Valid cityId is required" }, { status: 400 })
  }

  const fictions = await getCityFictionsWithScenesForViewer(cityId)
  return NextResponse.json(fictions satisfies FictionWithMedia[])
}
