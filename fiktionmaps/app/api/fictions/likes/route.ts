import { NextResponse } from "next/server"
import { createAnonymousClient } from "@/lib/supabase/server"
import { isUuidString } from "@/lib/validation/primitives"

/** GET: like counts for the provided fiction ids. */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const fictionIdsParam = searchParams.get("fictionIds") || ""

  const fictionIds = fictionIdsParam
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)

  const validIds = fictionIds.filter((id) => isUuidString(id))
  if (validIds.length === 0) return NextResponse.json({ likeCountByFictionId: {} })

  const supabase = createAnonymousClient()
  const { data, error } = await supabase
    .from("fiction_likes")
    .select("fiction_id")
    .in("fiction_id", validIds)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const likeCountByFictionId: Record<string, number> = {}
  for (const r of data ?? []) {
    const fid = r.fiction_id as string
    likeCountByFictionId[fid] = (likeCountByFictionId[fid] ?? 0) + 1
  }

  // Ensure missing fictions appear as 0.
  for (const fid of validIds) {
    likeCountByFictionId[fid] = likeCountByFictionId[fid] ?? 0
  }

  return NextResponse.json({ likeCountByFictionId })
}

