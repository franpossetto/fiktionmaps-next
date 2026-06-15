import { anthropic } from "@/lib/ai/claude"
import type { LLMPort } from "@/lib/ai/llm.port"

export class ClaudeProvider implements LLMPort {
  readonly name = "claude"
  readonly model = "claude-opus-4-8"

  async completeJSON(prompt: string): Promise<string> {
    const response = await anthropic.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    })
    const block = response.content[0]
    return block?.type === "text" ? block.text : "{}"
  }
}
