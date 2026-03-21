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

export async function GET(
  req: Request,
  context: { params: Promise<{ fictionId: string }> }
) {
  const userId = await requireUserId()
  if (!userId) return jsonError("Unauthorized", 401)

  const { fictionId } = await context.params
  if (!isValidUuid(fictionId)) return jsonError("Invalid fictionId")

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("fiction_interests")
    .select("interest_id")
    .eq("fiction_id", fictionId)

  if (error) return jsonError(error.message, 500)

  return NextResponse.json((data ?? []).map((r) => r.interest_id) as string[])
}

export async function PUT(
  req: Request,
  context: { params: Promise<{ fictionId: string }> }
) {
  const userId = await requireUserId()
  if (!userId) return jsonError("Unauthorized", 401)

  const { fictionId } = await context.params
  if (!isValidUuid(fictionId)) return jsonError("Invalid fictionId")

  let payload: { interestIds: string[] }
  try {
    payload = (await req.json()) as { interestIds: string[] }
  } catch {
    return jsonError("Invalid JSON body")
  }

  if (!payload || !Array.isArray(payload.interestIds)) return jsonError("interestIds must be an array")
  const interestIds = payload.interestIds.filter((id) => typeof id === "string" && id.trim().length > 0)
  if (!interestIds.every((id) => isValidUuid(id))) return jsonError("All interestIds must be valid UUIDs")

  const supabase = await createClient()

  // Replace assignments for this fiction (v1).
  const { error: delError } = await supabase.from("fiction_interests").delete().eq("fiction_id", fictionId)
  if (delError) return jsonError(delError.message, 500)

  if (interestIds.length > 0) {
    const { error: insError } = await supabase.from("fiction_interests").insert(
      interestIds.map((interest_id) => ({
        fiction_id: fictionId,
        interest_id,
        weight: 1,
      }))
    )
    if (insError) return jsonError(insError.message, 500)
  }

  return NextResponse.json({ success: true })
}

