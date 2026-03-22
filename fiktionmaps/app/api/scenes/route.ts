import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import {
  createScene,
  listScenes,
  type CreateSceneData,
} from "@/lib/app-services"

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isValidUuid(id: string): boolean {
  return UUID_REGEX.test(id)
}

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

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
  const fictionId = url.searchParams.get("fictionId")?.trim()
  const placeId = url.searchParams.get("placeId")?.trim()
  const locationId = url.searchParams.get("locationId")?.trim()
  const activeParam = url.searchParams.get("active")

  if (fictionId && !isValidUuid(fictionId)) return jsonError("Invalid fictionId")
  if (placeId && !isValidUuid(placeId)) return jsonError("Invalid placeId")
  if (locationId && !isValidUuid(locationId)) return jsonError("Invalid locationId")

  let active: boolean | undefined
  if (activeParam === "true") active = true
  else if (activeParam === "false") active = false

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

  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return jsonError("Invalid JSON body")
  }

  const fictionId = typeof body.fictionId === "string" ? body.fictionId.trim() : ""
  const placeId = typeof body.placeId === "string" ? body.placeId.trim() : ""
  const title = typeof body.title === "string" ? body.title.trim() : ""
  const description = typeof body.description === "string" ? body.description.trim() : ""

  if (!fictionId || !isValidUuid(fictionId)) return jsonError("fictionId is required and must be a UUID")
  if (!placeId || !isValidUuid(placeId)) return jsonError("placeId is required and must be a UUID")
  if (!title) return jsonError("title is required")
  if (!description) return jsonError("description is required")

  const okFiction = await fictionAllowsScenes(supabase, fictionId)
  if (!okFiction) return jsonError("Scenes are only allowed for movie or tv-series fictions", 400)

  const payload: CreateSceneData = {
    fictionId,
    placeId,
    title,
    description,
    quote: body.quote != null ? String(body.quote) : null,
    timestampLabel:
      body.timestampLabel != null ? String(body.timestampLabel) : body.timestamp != null ? String(body.timestamp) : null,
    season: typeof body.season === "number" ? body.season : body.season != null ? Number(body.season) : null,
    episode: typeof body.episode === "number" ? body.episode : body.episode != null ? Number(body.episode) : null,
    episodeTitle: body.episodeTitle != null ? String(body.episodeTitle) : null,
    videoUrl: body.videoUrl != null ? String(body.videoUrl) : null,
    sortOrder: typeof body.sortOrder === "number" ? body.sortOrder : 0,
    active: body.active === false ? false : true,
  }

  if (payload.season != null && (payload.season <= 0 || !Number.isFinite(payload.season)))
    return jsonError("Invalid season")
  if (payload.episode != null && (payload.episode <= 0 || !Number.isFinite(payload.episode)))
    return jsonError("Invalid episode")

  const scene = await createScene(payload, userId)
  if (!scene) return jsonError("Failed to create scene", 500)

  return NextResponse.json(scene, { status: 201 })
}
