import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { interestIdsBodySchema } from "@/lib/validation/api-payloads"
import { jsonError, jsonZodError } from "@/lib/validation/http"
import { uuidSchema } from "@/lib/validation/primitives"

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
  _req: Request,
  context: { params: Promise<{ fictionId: string }> }
) {
  const userId = await requireUserId()
  if (!userId) return jsonError("Unauthorized", 401)

  const { fictionId } = await context.params
  if (!uuidSchema.safeParse(fictionId).success) return jsonError("Invalid fictionId")

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
  if (!uuidSchema.safeParse(fictionId).success) return jsonError("Invalid fictionId")

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
