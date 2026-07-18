import type { LLMPort } from "@/lib/ai/llm.port"
import type { HuntPlace } from "@/src/hunts/domain/hunt.types"
import { buildExtractionPrompt } from "@/src/hunts/domain/hunt.prompts"

export async function extractPlacesFromContent(
  content: string,
  fictionTitle: string,
  llm: LLMPort,
): Promise<HuntPlace[]> {
  const prompt = buildExtractionPrompt(content, fictionTitle)
  const result = await llm.completeJSON(prompt)
  const parsed = JSON.parse(result) as {
    places?: Omit<HuntPlace, "address_source" | "is_landmark" | "duplicate_of" | "shoot_environment">[]
  }

  return (parsed.places ?? []).map((p) => ({
    ...p,
    address_source: "unknown" as const,
    is_landmark: false,
    lat: null,
    lng: null,
    duplicate_of: null,
    shoot_environment: null,
  }))
}
