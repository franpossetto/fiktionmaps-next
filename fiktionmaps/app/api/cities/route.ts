import { NextResponse } from "next/server"
import { getAllCities } from "@/src/server"

/** GET: list all cities (public, for map etc.). Uses cached reads from `@/src/server`. */
export async function GET() {
  try {
    const cities = await getAllCities()
    return NextResponse.json(cities)
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load cities"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
