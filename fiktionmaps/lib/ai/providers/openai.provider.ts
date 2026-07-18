import { openai } from "@/lib/ai/openai"
import type { LLMPort } from "@/lib/ai/llm.port"

export class OpenAIProvider implements LLMPort {
  readonly name = "openai"
  readonly model = "gpt-4o-mini"

  async completeJSON(prompt: string): Promise<string> {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }],
    })
    return response.choices[0]?.message?.content ?? "{}"
  }
}
