import type { LLMPort } from "./llm.port"

export function isAIAvailable(): boolean {
  const provider = process.env.AI_PROVIDER ?? "claude"
  if (provider === "openai") return !!process.env.OPENAI_API_KEY
  return !!process.env.ANTHROPIC_API_KEY
}

export async function getLLMProvider(): Promise<LLMPort> {
  const provider = process.env.AI_PROVIDER ?? "claude"
  if (provider === "openai") {
    const { OpenAIProvider } = await import("./providers/openai.provider")
    return new OpenAIProvider()
  }
  const { ClaudeProvider } = await import("./providers/claude.provider")
  return new ClaudeProvider()
}
