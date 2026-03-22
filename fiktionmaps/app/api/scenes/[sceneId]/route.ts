import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { deleteScene, getSceneById, updateScene, type UpdateSceneData } from "@/lib/app-services"

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

type RouteContext = { params: Promise<{ sceneId: string }> }

/** GET: single scene */
export async function GET(_req: Request, context: RouteContext) {
  const { sceneId } = await context.params
  if (!isValidUuid(sceneId)) return jsonError("Invalid sceneId")

  const scene = await getSceneById(sceneId)
  if (!scene) return jsonError("Not found", 404)
  return NextResponse.json(scene)
}

/** PATCH: update scene */
export async function PATCH(req: Request, context: RouteContext) {
  const auth = await requireUserId()
  if (!auth) return jsonError("Unauthorized", 401)
  const { supabase } = auth

  const { sceneId } = await context.params
  if (!isValidUuid(sceneId)) return jsonError("Invalid sceneId")

  const existing = await getSceneById(sceneId)
  if (!existing) return jsonError("Not found", 404)

  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return jsonError("Invalid JSON body")
  }

  const payload: UpdateSceneData = {}

  if (body.fictionId !== undefined) {
    const fictionId = String(body.fictionId).trim()
    if (!isValidUuid(fictionId)) return jsonError("Invalid fictionId")
    const ok = await fictionAllowsScenes(supabase, fictionId)
    if (!ok) return jsonError("Scenes are only allowed for movie or tv-series fictions", 400)
    payload.fictionId = fictionId
  }
  if (body.placeId !== undefined) {
    const placeId = String(body.placeId).trim()
    if (!isValidUuid(placeId)) return jsonError("Invalid placeId")
    payload.placeId = placeId
  }
  if (body.title !== undefined) payload.title = String(body.title).trim()
  if (body.description !== undefined) payload.description = String(body.description).trim()
  if (body.quote !== undefined) payload.quote = body.quote === null ? null : String(body.quote)
  if (body.timestampLabel !== undefined) payload.timestampLabel = body.timestampLabel === null ? null : String(body.timestampLabel)
  if (body.timestamp !== undefined && body.timestampLabel === undefined)
    payload.timestampLabel = body.timestamp === null ? null : String(body.timestamp)
  if (body.season !== undefined)
    payload.season = body.season === null ? null : Number(body.season)
  if (body.episode !== undefined)
    payload.episode = body.episode === null ? null : Number(body.episode)
  if (body.episodeTitle !== undefined)
    payload.episodeTitle = body.episodeTitle === null ? null : String(body.episodeTitle)
  if (body.videoUrl !== undefined)
    payload.videoUrl = body.videoUrl === null ? null : String(body.videoUrl)
  if (body.sortOrder !== undefined) payload.sortOrder = Number(body.sortOrder)
  if (body.active !== undefined) payload.active = Boolean(body.active)

  const targetFictionId = payload.fictionId ?? existing.fictionId
  if (!(await fictionAllowsScenes(supabase, targetFictionId)))
    return jsonError("Scenes are only allowed for movie or tv-series fictions", 400)

  if (payload.season != null && (payload.season <= 0 || !Number.isFinite(payload.season)))
    return jsonError("Invalid season")
  if (payload.episode != null && (payload.episode <= 0 || !Number.isFinite(payload.episode)))
    return jsonError("Invalid episode")

  const scene = await updateScene(sceneId, payload)
  if (!scene) return jsonError("Failed to update scene", 500)
  return NextResponse.json(scene)
}

/** DELETE: remove scene (+ storage object for video if in our bucket) */
export async function DELETE(_req: Request, context: RouteContext) {
  const auth = await requireUserId()
  if (!auth) return jsonError("Unauthorized", 401)

  const { sceneId } = await context.params
  if (!isValidUuid(sceneId)) return jsonError("Invalid sceneId")

  const existing = await getSceneById(sceneId)
  if (!existing) return jsonError("Not found", 404)

  const ok = await deleteScene(sceneId)
  if (!ok) return jsonError("Failed to delete scene", 500)
  return NextResponse.json({ success: true })
}
