import { NextResponse } from "next/server"
import type { ZodError } from "zod"

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

/** First issue message for simple API error responses. */
export function zodErrorMessage(error: ZodError): string {
  const first = error.issues[0]
  if (!first) return "Validation failed"
  const path = first.path.length ? `${first.path.join(".")}: ` : ""
  return `${path}${first.message}`
}

export function jsonZodError(error: ZodError, status = 400) {
  return NextResponse.json({ error: zodErrorMessage(error) }, { status })
}
