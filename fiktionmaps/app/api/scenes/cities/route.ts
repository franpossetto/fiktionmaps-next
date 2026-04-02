import { NextResponse } from "next/server"
import { getCitiesWithScenesForViewer } from "@/lib/server/queries"

/** GET: cities that have at least one active scene with video (Scenes viewer). */
export async function GET() {
  const cities = await getCitiesWithScenesForViewer()
  return NextResponse.json(cities)
}
