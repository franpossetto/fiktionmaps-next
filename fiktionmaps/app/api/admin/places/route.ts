import { NextResponse } from "next/server"
import { getAllPlaces, createPlace } from "@/lib/app-services"
import type { CreatePlaceData } from "@/src/places"

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isUuid(s: string): boolean {
  return UUID_REGEX.test(s)
}

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

export async function GET() {
  const locations = await getAllPlaces()
  return NextResponse.json(locations)
}

export async function POST(req: Request) {
  try {
    let payload: CreatePlaceData
    try {
      payload = (await req.json()) as CreatePlaceData
    } catch {
      return jsonError("Invalid JSON body")
    }

    if (!payload.fictionId) return jsonError("fictionId is required")
    if (!payload.cityId) return jsonError("cityId is required")
    if (!isUuid(payload.fictionId)) return jsonError("fictionId must be a valid UUID")
    if (!isUuid(payload.cityId)) return jsonError("cityId must be a valid UUID")
    if (!payload.name?.trim()) return jsonError("name is required")
    if (!Number.isFinite(payload.latitude) || payload.latitude < -90 || payload.latitude > 90)
      return jsonError("Invalid latitude")
    if (!Number.isFinite(payload.longitude) || payload.longitude < -180 || payload.longitude > 180)
      return jsonError("Invalid longitude")
    if (!payload.description?.trim()) return jsonError("description is required")

    const result = await createPlace(payload)
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
