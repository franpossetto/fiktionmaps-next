import { NextResponse } from "next/server"
import { createAnonymousClient } from "@/lib/supabase/server"
import type { InterestCatalogItem } from "@/src/interests"

const DEFAULT_LOCALE = "en"

/** GET: active interests catalog for onboarding/admin selectors. */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const locale = searchParams.get("locale") || DEFAULT_LOCALE

  const supabase = createAnonymousClient()

  // 1) Fetch active interests
  const { data: interests, error: iError } = await supabase
    .from("interests")
    .select("id, key")
    .eq("active", true)
    .order("key")

  if (iError) return NextResponse.json({ error: iError.message }, { status: 500 })

  const interestRows = (interests ?? []) as { id: string; key: string }[]
  if (interestRows.length === 0) return NextResponse.json([] satisfies InterestCatalogItem[])

  // 2) Fetch translations for the requested locale
  const ids = interestRows.map((i) => i.id)
  const { data: translations, error: tError } = await supabase
    .from("interest_translations")
    .select("interest_id, label")
    .eq("locale", locale)
    .in("interest_id", ids)

  if (tError) return NextResponse.json({ error: tError.message }, { status: 500 })

  const labelByInterestId = new Map<string, string>()
  for (const r of translations ?? []) {
    labelByInterestId.set(r.interest_id as string, r.label as string)
  }

  const result: InterestCatalogItem[] = interestRows.map((i) => ({
    id: i.id,
    key: i.key,
    label: labelByInterestId.get(i.id) ?? i.key,
  }))

  return NextResponse.json(result)
}

