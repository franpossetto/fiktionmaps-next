import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

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
  return user.id
}

/** POST: toggles like for the current user and returns `{ liked, likeCount }`. */
export async function POST(
  req: Request,
) {
  const userId = await requireUserId()
  if (!userId) return jsonError("Unauthorized", 401)

  let payload: { fictionId: string }
  try {
    payload = (await req.json()) as { fictionId: string }
  } catch {
    return jsonError("Invalid JSON body")
  }

  if (!payload?.fictionId || typeof payload.fictionId !== "string") {
    return jsonError("fictionId is required")
  }
  const fictionId = payload.fictionId.trim()
  if (!isValidUuid(fictionId)) return jsonError("Invalid fictionId")

  const supabase = await createClient()

  // 1) Determine current like state.
  const { data: existing, error: existingError } = await supabase
    .from("fiction_likes")
    .select("fiction_id")
    .eq("user_id", userId)
    .eq("fiction_id", fictionId)
    .maybeSingle()

  if (existingError) return jsonError(existingError.message, 500)

  const currentlyLiked = !!existing

  // 2) Toggle.
  if (currentlyLiked) {
    const { error: delError } = await supabase
      .from("fiction_likes")
      .delete()
      .eq("user_id", userId)
      .eq("fiction_id", fictionId)
    if (delError) return jsonError(delError.message, 500)
  } else {
    const { error: insError } = await supabase.from("fiction_likes").insert({
      user_id: userId,
      fiction_id: fictionId,
    })
    if (insError) return jsonError(insError.message, 500)
  }

  // 3) Recompute like count (public).
  const { data: countRows, error: countError } = await supabase
    .from("fiction_likes")
    .select("fiction_id")
    .eq("fiction_id", fictionId)

  if (countError) return jsonError(countError.message, 500)

  const likeCount = (countRows ?? []).length

  return NextResponse.json({
    liked: !currentlyLiked,
    likeCount,
  })
}

