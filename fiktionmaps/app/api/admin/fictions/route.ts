import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createFictionsSupabaseAdapter } from "@/src/fictions/fiction.repository.adapter"

/** GET: list all fictions from the database (for admin dropdowns, e.g. place creation). */
export async function GET() {
  const fictions = await createFictionsSupabaseAdapter(createClient).getAll()
  return NextResponse.json(fictions)
}
