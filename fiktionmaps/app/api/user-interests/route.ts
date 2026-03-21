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

  if (error || !user) return { userId: null as string | null, error }
  return { userId: user.id, error }
}

/** GET: returns the current user's interest ids. */
export async function GET() {
  const { userId } = await requireUserId()
  if (!userId) return jsonError("Unauthorized", 401)

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("user_interests")
    .select("interest_id")
    .eq("user_id", userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json((data ?? []).map((r) => r.interest_id) as string[])
}

/** PUT: replaces the current user's onboarding selections. */
export async function PUT(req: Request) {
  const { userId } = await requireUserId()
  if (!userId) return jsonError("Unauthorized", 401)

  let payload: { interestIds: string[] }
  try {
    payload = (await req.json()) as { interestIds: string[] }
  } catch {
    return jsonError("Invalid JSON body")
  }

  if (!Array.isArray(payload.interestIds)) return jsonError("interestIds must be an array")
  const interestIds = payload.interestIds.filter((id) => typeof id === "string" && id.trim().length > 0)
  if (!interestIds.every(isValidUuid)) return jsonError("All interestIds must be valid UUIDs")

  const supabase = await createClient()

  // Replace selection: simplest and safest for v1.
  const { error: delError } = await supabase.from("user_interests").delete().eq("user_id", userId)
  if (delError) return NextResponse.json({ error: delError.message }, { status: 500 })

  if (interestIds.length === 0) return NextResponse.json({ success: true })

  const { error: insError } = await supabase.from("user_interests").insert(
    interestIds.map((interest_id) => ({
      user_id: userId,
      interest_id,
      source: "onboarding",
    }))
  )

  if (insError) return NextResponse.json({ error: insError.message }, { status: 500 })

  return NextResponse.json({ success: true })
}

