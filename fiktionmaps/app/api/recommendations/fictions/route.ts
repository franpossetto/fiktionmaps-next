import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import type { FictionWithMedia } from "@/src/fictions/fiction.domain"
import { mapAssetImagesToFiction } from "@/src/fictions/fiction.mappers"

type ScoredFiction = { fictionId: string; score: number }

/** GET: recommended fictions for current user based on interest matching (v1). */
export async function GET(req: Request) {
  const url = new URL(req.url)
  const limitRaw = url.searchParams.get("limit")
  const limit = limitRaw ? Math.max(1, Math.min(50, Number(limitRaw))) : 12

  const supabase = await createClient()
  const {
    data: { user },
    error: uError,
  } = await supabase.auth.getUser()

  if (uError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // 1) Load user's interests
  const { data: uiRows, error: uiError } = await supabase
    .from("user_interests")
    .select("interest_id")
    .eq("user_id", user.id)

  if (uiError) return NextResponse.json({ error: uiError.message }, { status: 500 })

  const interestIds = (uiRows ?? []).map((r) => r.interest_id as string)
  if (interestIds.length === 0) return NextResponse.json([] satisfies FictionWithMedia[])

  // 2) Load fiction_interests for those interests and compute scores in code (simple v1).
  const { data: fiRows, error: fiError } = await supabase
    .from("fiction_interests")
    .select("fiction_id, interest_id, weight")
    .in("interest_id", interestIds)

  if (fiError) return NextResponse.json({ error: fiError.message }, { status: 500 })

  const scoresByFiction = new Map<string, number>()
  for (const row of fiRows ?? []) {
    const fictionId = row.fiction_id as string
    const weight = Number(row.weight ?? 1)
    scoresByFiction.set(fictionId, (scoresByFiction.get(fictionId) ?? 0) + weight)
  }

  const scoredFictions: ScoredFiction[] = [...scoresByFiction.entries()].map(([fictionId, score]) => ({
    fictionId,
    score,
  }))

  scoredFictions.sort((a, b) => b.score - a.score)
  const top = scoredFictions.slice(0, limit)
  const fictionIds = top.map((t) => t.fictionId)

  if (fictionIds.length === 0) return NextResponse.json([] satisfies FictionWithMedia[])

  // 3) Load fictions + asset images
  const { data: fictionsData, error: fError } = await supabase
    .from("fictions")
    .select("*")
    .in("id", fictionIds)
    .eq("active", true)

  if (fError || !fictionsData) return NextResponse.json({ error: fError?.message ?? "No data" }, { status: 500 })

  const ids = fictionsData.map((f) => f.id as string)
  const { data: imagesData, error: imgError } = await supabase
    .from("asset_images")
    .select("entity_id, role, variant, url")
    .eq("entity_type", "fiction")
    .in("entity_id", ids)

  if (imgError) return NextResponse.json({ error: imgError.message }, { status: 500 })

  // Build a map entity_id -> images
  const imagesByEntity = new Map<string, { entity_id: string; role: string; variant: string; url: string }[]>()
  for (const row of imagesData ?? []) {
    const entityId = row.entity_id as string
    const list = imagesByEntity.get(entityId) ?? []
    list.push(row as { entity_id: string; role: string; variant: string; url: string })
    imagesByEntity.set(entityId, list)
  }

  const scoreById = new Map(top.map((t) => [t.fictionId, t.score] as const))

  const fictions: FictionWithMedia[] = (fictionsData ?? []).map((f) => {
    const entityId = f.id as string
    return mapAssetImagesToFiction(f, imagesByEntity.get(entityId) ?? [])
  })

  fictions.sort((a, b) => (scoreById.get(b.id) ?? 0) - (scoreById.get(a.id) ?? 0))

  return NextResponse.json(fictions)
}

