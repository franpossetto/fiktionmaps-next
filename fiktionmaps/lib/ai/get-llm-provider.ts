import type { LLMPort } from "./llm.port"
import { OpenAIProvider } from "./providers/openai.provider"
import { ClaudeProvider } from "./providers/claude.provider"

export function getLLMProvider(): LLMPort {
  const provider = process.env.AI_PROVIDER ?? "claude"
  return provider === "openai" ? new OpenAIProvider() : new ClaudeProvider()
}
