import { NextResponse } from "next/server"
import { createAnonymousClient } from "@/lib/supabase/server"

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isValidUuid(id: string): boolean {
  return UUID_REGEX.test(id)
}

/** GET: like counts for the provided fiction ids. */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const fictionIdsParam = searchParams.get("fictionIds") || ""

  const fictionIds = fictionIdsParam
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)

  const validIds = fictionIds.filter((id) => isValidUuid(id))
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

