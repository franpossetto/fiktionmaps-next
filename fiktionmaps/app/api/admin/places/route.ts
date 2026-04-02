import { NextResponse } from "next/server"
import { getAllPlaces, createPlace } from "@/lib/server"
import { jsonError, jsonZodError } from "@/lib/validation/http"
import { createPlaceSchema } from "@/src/places/place.schemas"

export async function GET() {
  const locations = await getAllPlaces()
  return NextResponse.json(locations)
}

export async function POST(req: Request) {
  try {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return jsonError("Invalid JSON body")
    }

    const parsed = createPlaceSchema.safeParse(body)
    if (!parsed.success) return jsonZodError(parsed.error)

    const result = await createPlace(parsed.data)
    if (!result) {
      return NextResponse.json({ error: "Failed to create place" }, { status: 500 })
    }

    const locations = await getAllPlaces()
    return NextResponse.json({
      success: true,
      locations,
      createdPlaceId: result.placeId,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error"
    console.error("[POST /api/admin/places] unhandled error:", err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
