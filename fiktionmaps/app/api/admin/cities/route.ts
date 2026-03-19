import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import type { City } from "@/src/cities/city.domain"

/** GET: list all cities from the database (for admin dropdowns, etc.). */
export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase.from("cities").select("*").order("name")
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json((data ?? []) as City[])
}
