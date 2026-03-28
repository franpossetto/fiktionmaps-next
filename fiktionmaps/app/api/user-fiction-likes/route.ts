import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { isUuidString } from "@/lib/validation/primitives"

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

async function requireUserId() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) return { userId: null as string | null, error }
  return { userId: user.id, error: null }
}

/** GET: returns the current user's liked fiction ids. */
export async function GET() {
  const { userId } = await requireUserId()
  if (!userId) return jsonError("Unauthorized", 401)

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("fiction_likes")
    .select("fiction_id")
    .eq("user_id", userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const fictionIds = (data ?? [])
    .map((r) => r.fiction_id as string)
    .filter((id) => isUuidString(id))

  return NextResponse.json(fictionIds)
}

