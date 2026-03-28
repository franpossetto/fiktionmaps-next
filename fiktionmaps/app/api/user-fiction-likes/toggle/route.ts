import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { toggleFictionLikeBodySchema } from "@/lib/validation/api-payloads"
import { jsonError, jsonZodError } from "@/lib/validation/http"

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

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return jsonError("Invalid JSON body")
  }

  const parsed = toggleFictionLikeBodySchema.safeParse(body)
  if (!parsed.success) return jsonZodError(parsed.error)

  const fictionId = parsed.data.fictionId

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
