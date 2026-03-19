import { NextResponse } from "next/server"
import { createAnonymousClient } from "@/lib/supabase/server"
import type { City } from "@/src/cities/city.domain"

/** GET: list all cities from the database (public, for map etc.). */
export async function GET() {
  const supabase = createAnonymousClient()
  const { data, error } = await supabase.from("cities").select("*").order("name")
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json((data ?? []) as City[])
}
