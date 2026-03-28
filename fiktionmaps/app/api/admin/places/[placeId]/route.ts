import { NextResponse } from "next/server"
import { updatePlace } from "@/lib/app-services"
import { jsonError, jsonZodError } from "@/lib/validation/http"
import { uuidSchema } from "@/lib/validation/primitives"
import { updatePlaceSchema } from "@/src/places/place.schemas"

export async function PATCH(
  req: Request,
  context: { params: Promise<{ placeId: string }> }
) {
  const { placeId } = await context.params
  const idParsed = uuidSchema.safeParse(placeId)
  if (!idParsed.success) {
    return jsonError("Invalid place ID")
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return jsonError("Invalid JSON body")
  }

  const parsed = updatePlaceSchema.safeParse(body)
  if (!parsed.success) return jsonZodError(parsed.error)

  const updated = await updatePlace(placeId, parsed.data)
  if (!updated) {
    return NextResponse.json({ error: "Place not found" }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
