import { NextResponse } from "next/server"
import { updatePlace } from "@/lib/app-services"
import type { UpdatePlaceData } from "@/src/places"

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isUuid(s: string): boolean {
  return UUID_REGEX.test(s)
}

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ placeId: string }> }
) {
  const { placeId } = await context.params
  if (!isUuid(placeId)) {
    return jsonError("Invalid place ID")
  }

  let payload: UpdatePlaceData
  try {
    payload = (await req.json()) as UpdatePlaceData
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

  const updated = await updatePlace(placeId, payload)
  if (!updated) {
    return NextResponse.json({ error: "Place not found" }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
