"use server"

import { cache } from "react"
import { createClient } from "@/lib/supabase/server"

export type ProfileScenePreview = {
  id: string
  fictionId: string
  /** `places.id` — same as `Location.id` on the map. */
  placeId: string
  title: string
  fictionTitle: string
  imageUrl: string | null
}

export type ProfileArticlePreview = {
  id: string
  title: string
  subtitle: string
  imageUrl: string | null
}

type SceneImgRow = { entity_id: string; role: string; variant: string; url: string }

function pickSceneThumb(rows: SceneImgRow[]): string | null {
  if (!rows.length) return null
  const sm = rows.filter((r) => r.variant === "sm")
  const pool = sm.length ? sm : rows
  const byRole = (role: string) => pool.find((r) => r.role === role)
  return (
    byRole("hero")?.url ??
    byRole("cover")?.url ??
    byRole("avatar")?.url ??
    pool[0]?.url ??
    null
  )
}

function fictionTitleFromJoin(f: unknown): string {
  if (!f || typeof f !== "object") return ""
  const o = f as { title?: string }
  return typeof o.title === "string" ? o.title : ""
}

/** Scenes the current user created, with preview from `asset_images` (entity_type scene). */
async function fetchProfileScenesPreview(): Promise<ProfileScenePreview[]> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user?.id) return []

    const { data: scenes, error } = await supabase
      .from("scenes")
      .select("id, title, place_id, fiction_id, fictions ( title )")
      .eq("active", true)
      .eq("created_by", user.id)
      .order("created_at", { ascending: false })
      .limit(5)

    if (error || !scenes?.length) return []

    const sceneIds = scenes.map((s) => s.id)
    const { data: imgs } = await supabase
      .from("asset_images")
      .select("entity_id, role, variant, url")
      .eq("entity_type", "scene")
      .in("entity_id", sceneIds)

    const byScene = new Map<string, SceneImgRow[]>()
    for (const row of imgs ?? []) {
      const r = row as SceneImgRow
      const list = byScene.get(r.entity_id) ?? []
      list.push(r)
      byScene.set(r.entity_id, list)
    }

    return scenes.flatMap((s) => {
      const fictionTitle = fictionTitleFromJoin((s as { fictions?: unknown }).fictions)
      const placeId = (s as { place_id?: string }).place_id
      const fictionId = (s as { fiction_id?: string }).fiction_id
      if (!placeId || !fictionId) return []
      return [
        {
          id: s.id,
          fictionId,
          placeId,
          title: s.title,
          fictionTitle,
          imageUrl: pickSceneThumb(byScene.get(s.id) ?? []),
        },
      ]
    })
  } catch {
    return []
  }
}

/**
 * Request-scoped dedupe. If profile server render asks for scenes more than once,
 * we reuse the same query result within that request.
 */
export const getProfileScenesPreviewAction = cache(fetchProfileScenesPreview)
