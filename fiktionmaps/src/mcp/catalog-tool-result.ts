/** MCP tool payload. Field mapping stays in each tool. */
export function catalogToolResult(value: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(value) }],
  }
}

export function briefText(value: string | null | undefined, max = 280): string {
  const text = value?.trim() ?? ""
  if (text.length <= max) return text
  return `${text.slice(0, max - 1)}…`
}
