import type { Place } from "@/src/places/domain/place.entity"

/**
 * Prompt for extracting filming locations from clean Markdown content (Jina Reader output).
 * Uses the LLM's training knowledge to enrich missing fields for recognized landmarks.
 */
export function buildExtractionPrompt(content: string, fictionTitle: string): string {
  return `You are a geography and filming-location expert. Extract every place where "${fictionTitle}" was filmed from the content below.

## Field mapping (strict — maps to our database)

- "name": The recognizable place or venue name (POI). Title Case.
  Examples: "St Brendan's Church", "Millennium Biltmore Hotel", "Brooklyn Bridge".
  NEVER a street address. NEVER duplicate what goes in "address".

- "address": ONLY the street address if explicitly written on the page (e.g. "310 South Van Ness Avenue").
  NEVER the place name. NEVER the city or country. Leave "" if not on the page.

- "city": The municipality (city or town). Title Case.
  Example: "Los Angeles", "Paris", "Brooklyn" (if that is how the page identifies it).
  If the page says "Los Angeles, California" → city is "Los Angeles", NOT "California".

- "country": The sovereign country ONLY. Title Case.
  Examples: "United States", "France", "United Kingdom".
  NEVER a state, province, or region (California, Bavaria, Catalonia are NOT countries).
  If the page only mentions a US state, infer country "United States". Same for other well-known state→country pairs.

- "description": 1–2 sentences from the page about the scene or why this location was used. Leave "" if not available.

- "confidence": "high" = explicitly stated as a filming location · "medium" = likely · "low" = ambiguous.

## Rules
- "name" and "address" are different fields — never swap or mix them.
- Do not invent places or field values not supported by the text.
- Return an empty array if nothing relevant is found.

Reply ONLY with valid JSON — no markdown fences, no extra text:
{ "places": [ { "name": "", "address": "", "city": "", "country": "", "description": "", "confidence": "high|medium|low" } ] }

CONTENT:
${content.slice(0, 20_000)}`
}

/**
 * Prompt for enriching a single extracted place with the LLM's training knowledge.
 * Run after extraction so the two concerns don't interfere.
 */
export function buildEnrichmentPrompt(place: {
  name: string
  address: string
  city: string
  country: string
}): string {
  return `You are a geography and location data expert.

Normalize and enrich the following filming location. Act as an expert — fix geographic errors confidently.

Input:
- name: ${place.name}
- address: ${place.address || "(empty)"}
- city: ${place.city}
- country: ${place.country}

Tasks:
1. "name": Official place/venue name in Title Case. NEVER a street address.
2. "address": Street address only. NEVER the place name. Keep existing address if correct; fill only if you know it with high confidence. Leave "" if unknown.
3. "city": Correct municipality. Fix if a state/region was wrongly placed here.
4. "country": Sovereign country only (e.g. "United States", "France"). NEVER a state or province — fix "California" → "United States" with city "Los Angeles".
5. "is_landmark": true ONLY for world-famous tourist landmarks (e.g. Eiffel Tower, Statue of Liberty). false for ordinary venues, streets, businesses, or filming locations that are not iconic on their own — default to false when unsure.
6. "address_source": "knowledge" if you filled address from training data, "unknown" if address stays empty.
7. "shoot_environment": Where scenes at this location were primarily filmed. Use "interior" for indoor sets, buildings, studios, or rooms; "exterior" for streets, parks, outdoor landmarks, or open-air shots; "interior_exterior" when both matter equally (e.g. a café with notable indoor and outdoor scenes). Use null if you cannot infer from the place name and context.

"name" and "address" must remain separate — do not put the street in "name" or the venue name in "address".

Reply ONLY with valid JSON:
{ "name": "", "address": "", "city": "", "country": "", "is_landmark": false, "address_source": "knowledge|unknown", "shoot_environment": "interior|exterior|interior_exterior|null" }`
}

/**
 * Prompt for semantic duplicate detection against existing DB places.
 */
export function buildDeduplicationPrompt(
  candidate: { name: string; city: string; country: string; address: string },
  existingPlaces: Place[],
): string {
  const existingList = existingPlaces
    .map((p) => `- id: ${p.id}, name: ${p.name}`)
    .join("\n")

  return `You are a location deduplication assistant.

Candidate place:
- name: ${candidate.name}
- city: ${candidate.city}
- country: ${candidate.country}
- address: ${candidate.address || "unknown"}

Existing places in the database:
${existingList}

Does the candidate refer to the same real-world location as any place in the list?
Consider: name variations, abbreviations, alternate spellings, landmarks vs street addresses for the same spot.

Reply ONLY with valid JSON:
{ "duplicate_of": "<uuid>" }   ← if it matches an existing place
{ "duplicate_of": null }        ← if it is a new place`
}
