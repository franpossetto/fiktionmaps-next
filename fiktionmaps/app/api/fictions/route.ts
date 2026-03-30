import { NextResponse } from "next/server"
import { createAnonymousClient } from "@/lib/supabase/server"
import { createFictionsSupabaseAdapter } from "@/src/fictions/fiction.repository.adapter"
import type { FictionWithMedia } from "@/src/fictions/fiction.domain"

/** GET: active fictions with cover/banner media (for onboarding + client selection). */
export async function GET() {
  const repo = createFictionsSupabaseAdapter(() => Promise.resolve(createAnonymousClient()))
  const fictions = (await repo.getAll()) as FictionWithMedia[]
  return NextResponse.json(fictions.filter((f) => f.active))
}

