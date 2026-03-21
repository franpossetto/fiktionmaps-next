import { NextResponse } from "next/server"
import { createAnonymousClient } from "@/lib/supabase/server"
import { getAllFictionsWithClient } from "@/src/fictions/fiction-cached-read"
import type { FictionWithMedia } from "@/src/fictions/fiction.domain"

/** GET: active fictions with cover/banner media (for onboarding + client selection). */
export async function GET() {
  const supabase = createAnonymousClient()
  const fictions = (await getAllFictionsWithClient(supabase)) as FictionWithMedia[]
  return NextResponse.json(fictions.filter((f) => f.active))
}

