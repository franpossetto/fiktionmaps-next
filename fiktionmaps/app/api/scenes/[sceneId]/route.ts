import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { jsonError, jsonZodError } from "@/lib/validation/http"
import { uuidSchema } from "@/lib/validation/primitives"
import { deleteScene, getSceneById, updateScene } from "@/lib/app-services"
import { patchSceneBodySchema } from "@/src/scenes/scene.schemas"

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
  const idParsed = uuidSchema.safeParse(sceneId)
  if (!idParsed.success) return jsonError("Invalid sceneId")

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
  const idParsed = uuidSchema.safeParse(sceneId)
  if (!idParsed.success) return jsonError("Invalid sceneId")

  const existing = await getSceneById(sceneId)
  if (!existing) return jsonError("Not found", 404)

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return jsonError("Invalid JSON body")
  }

  const parsed = patchSceneBodySchema.safeParse(body)
  if (!parsed.success) return jsonZodError(parsed.error)

  const payload = parsed.data

  if (payload.fictionId !== undefined) {
    const ok = await fictionAllowsScenes(supabase, payload.fictionId)
    if (!ok) return jsonError("Scenes are only allowed for movie or tv-series fictions", 400)
  }

  const targetFictionId = payload.fictionId ?? existing.fictionId
  if (!(await fictionAllowsScenes(supabase, targetFictionId)))
    return jsonError("Scenes are only allowed for movie or tv-series fictions", 400)

  const scene = await updateScene(sceneId, payload)
  if (!scene) return jsonError("Failed to update scene", 500)
  return NextResponse.json(scene)
}

/** DELETE: remove scene (+ storage object for video if in our bucket) */
export async function DELETE(_req: Request, context: RouteContext) {
  const auth = await requireUserId()
  if (!auth) return jsonError("Unauthorized", 401)

  const { sceneId } = await context.params
  const idParsed = uuidSchema.safeParse(sceneId)
  if (!idParsed.success) return jsonError("Invalid sceneId")

  const existing = await getSceneById(sceneId)
  if (!existing) return jsonError("Not found", 404)

  const ok = await deleteScene(sceneId)
  if (!ok) return jsonError("Failed to delete scene", 500)
  return NextResponse.json({ success: true })
}
