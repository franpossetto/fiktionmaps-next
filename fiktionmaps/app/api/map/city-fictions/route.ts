import { NextResponse } from "next/server"
import { createAnonymousClient } from "@/lib/supabase/server"
import { uuidSchema } from "@/lib/validation/primitives"
import { createFictionsSupabaseAdapter } from "@/src/fictions/fiction.repository.adapter"
import { createPlacesSupabaseAdapter } from "@/src/places/place.repository.adapter"
import type { FictionWithMedia } from "@/src/fictions/fiction.domain"

/** GET: fictions that have at least one place in the given city (for map selector). */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const cityId = searchParams.get("cityId")
  if (!cityId || !uuidSchema.safeParse(cityId).success) {
    return NextResponse.json({ error: "Valid cityId is required" }, { status: 400 })
  }

  const getAnon = () => Promise.resolve(createAnonymousClient())
  const placesRepo = createPlacesSupabaseAdapter(getAnon)
  const fictionsRepo = createFictionsSupabaseAdapter(getAnon)

  const fictionIds = await placesRepo.getFictionIdsByCityId(cityId)
  if (fictionIds.length === 0) {
    return NextResponse.json([] satisfies FictionWithMedia[])
  }

  const fictions = await fictionsRepo.getByIds(fictionIds)
  return NextResponse.json(fictions)
}
