import type { LLMPort } from "@/lib/ai/llm.port"
import type { HuntPlace, HuntAddressSource } from "@/src/hunts/domain/hunt.types"
import { buildEnrichmentPrompt } from "@/src/hunts/domain/hunt.prompts"

type EnrichmentResult = {
  name: string
  address: string
  city: string
  country: string
  is_landmark: boolean
  address_source: HuntAddressSource
}

export async function enrichPlace(place: HuntPlace, llm: LLMPort): Promise<HuntPlace> {
  const prompt = buildEnrichmentPrompt({
    name: place.name,
    address: place.address,
    city: place.city,
    country: place.country,
  })
  const content = await llm.completeJSON(prompt)
  const enriched = JSON.parse(content) as Partial<EnrichmentResult>

  const hadPageAddress = Boolean(place.address.trim())

  return {
    ...place,
    name: enriched.name || place.name,
    address: hadPageAddress ? place.address : (enriched.address || ""),
    city: enriched.city || place.city,
    country: enriched.country || place.country,
    is_landmark: enriched.is_landmark ?? false,
    address_source: hadPageAddress ? "page" : (enriched.address_source ?? "unknown"),
  }
}
