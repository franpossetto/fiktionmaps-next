import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { interestIdsBodySchema } from "@/lib/validation/api-payloads"
import { jsonError, jsonZodError } from "@/lib/validation/http"

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

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return jsonError("Invalid JSON body")
  }

  const parsed = interestIdsBodySchema.safeParse(body)
  if (!parsed.success) return jsonZodError(parsed.error)

  const { interestIds } = parsed.data

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
