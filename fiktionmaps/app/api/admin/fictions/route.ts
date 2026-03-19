import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getAllFictionsWithClient } from "@/src/fictions/fiction-cached-read"

/** GET: list all fictions from the database (for admin dropdowns, e.g. place creation). */
export async function GET() {
  const supabase = await createClient()
  const fictions = await getAllFictionsWithClient(supabase)
  return NextResponse.json(fictions)
}
