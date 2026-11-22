import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js"
import { createCatalogMcpServer } from "@/src/mcp/register-catalog-tools"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept, MCP-Protocol-Version, Mcp-Session-Id",
}

function withCors(response: Response): Response {
  const headers = new Headers(response.headers)
  for (const [key, value] of Object.entries(CORS_HEADERS)) headers.set(key, value)
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

async function handleMcp(req: Request): Promise<Response> {
  const server = createCatalogMcpServer()
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  })
  await server.connect(transport)
  return withCors(await transport.handleRequest(req))
}

export function GET(req: Request): Promise<Response> {
  return handleMcp(req)
}

export function POST(req: Request): Promise<Response> {
  return handleMcp(req)
}

export function DELETE(req: Request): Promise<Response> {
  return handleMcp(req)
}

export function OPTIONS(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS })
}
