export interface LLMPort {
  readonly name: string
  readonly model: string
  completeJSON(prompt: string): Promise<string>
}
