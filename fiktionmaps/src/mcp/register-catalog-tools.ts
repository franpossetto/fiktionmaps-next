import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { GET_FICTION_TOOL, registerFictionCatalogTools } from "@/src/mcp/fiction-catalog-tools"
import {
  GET_PLACE_TOOL,
  LIST_FICTION_PLACES_TOOL,
  SEARCH_CATALOG_TOOL,
  registerPlaceCatalogTools,
} from "@/src/mcp/place-catalog-tools"
import { LIST_SCENES_TOOL, registerSceneCatalogTools } from "@/src/mcp/scene-catalog-tools"

/** Read-only catalog tools. No create, update, or delete. */
export const CATALOG_TOOL_NAMES = [
  SEARCH_CATALOG_TOOL,
  GET_FICTION_TOOL,
  LIST_FICTION_PLACES_TOOL,
  GET_PLACE_TOOL,
  LIST_SCENES_TOOL,
] as const

export function createCatalogMcpServer(): McpServer {
  const server = new McpServer({
    name: "fiktionmaps",
    version: "0.1.0",
  })
  registerFictionCatalogTools(server)
  registerPlaceCatalogTools(server)
  registerSceneCatalogTools(server)
  return server
}
