import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { jsonError, jsonZodError } from "@/lib/validation/http"
import { createScene, listScenes } from "@/lib/server"
import {
  createSceneBodySchema,
  listScenesQuerySchema,
} from "@/src/scenes/scene.schemas"

async function requireUserId() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) return null
  return { supabase, userId: user.id }
}

async function fictionAllowsScenes(supabase: Awaited<ReturnType<typeof createClient>>, fictionId: string) {
  const { data, error } = await supabase.from("fictions").select("type").eq("id", fictionId).maybeSingle()
  if (error || !data) return false
  return data.type === "movie" || data.type === "tv-series"
}

/** GET: list scenes (public). Query: fictionId, placeId, locationId, active */
export async function GET(req: Request) {
  const url = new URL(req.url)
  const parsed = listScenesQuerySchema.safeParse({
    fictionId: url.searchParams.get("fictionId"),
    placeId: url.searchParams.get("placeId"),
    locationId: url.searchParams.get("locationId"),
    active: url.searchParams.get("active"),
  })
  if (!parsed.success) return jsonZodError(parsed.error)

  const { fictionId, placeId, locationId, active } = parsed.data

  const scenes = await listScenes({
    fictionId: fictionId || undefined,
    placeId: placeId || undefined,
    locationId: locationId || undefined,
    active,
  })

  return NextResponse.json(scenes)
}

/** POST: create scene (authenticated). Body: CreateSceneData (camelCase). */
export async function POST(req: Request) {
  const auth = await requireUserId()
  if (!auth) return jsonError("Unauthorized", 401)
  const { supabase, userId } = auth

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return jsonError("Invalid JSON body")
  }

  const parsed = createSceneBodySchema.safeParse(body)
  if (!parsed.success) return jsonZodError(parsed.error)

  const okFiction = await fictionAllowsScenes(supabase, parsed.data.fictionId)
  if (!okFiction) return jsonError("Scenes are only allowed for movie or tv-series fictions", 400)

  const scene = await createScene(parsed.data, userId)
  if (!scene) return jsonError("Failed to create scene", 500)

  return NextResponse.json(scene, { status: 201 })
}
