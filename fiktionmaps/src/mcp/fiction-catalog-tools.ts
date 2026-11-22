import { z } from "zod"
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { getPlaceCountsByFictionIdsUseCase } from "@/src/places/application/get-place-counts-by-fiction-ids.usecase"
import { getPublicFictionBySlugUseCase } from "@/src/fictions/application/get-public-fiction-by-slug.usecase"
import { fictionsRepoPublic, placesRepoPublic } from "@/src/shared/infrastructure/supabase/anon-repos"
import { briefText, catalogToolResult } from "@/src/mcp/catalog-tool-result"
import { fictionCatalogUrl } from "@/src/mcp/catalog-urls"

export const GET_FICTION_TOOL = "get_fiction"

export function registerFictionCatalogTools(server: McpServer): void {
  server.registerTool(
    GET_FICTION_TOOL,
    {
      title: "Get published fiction",
      description:
        "Get one published FiktionMaps fiction by its URL slug. Returns nothing when the fiction is missing, inactive, or not approved. Includes how many visible places it has and the public page URL.",
      inputSchema: {
        slug: z.string().trim().min(1).describe("Fiction slug from the public URL, for example inception"),
      },
    },
    async ({ slug }) => {
      const fiction = await getPublicFictionBySlugUseCase(slug, fictionsRepoPublic)
      if (!fiction) return catalogToolResult({ fiction: null })
      const counts = await getPlaceCountsByFictionIdsUseCase([fiction.id], placesRepoPublic)
      return catalogToolResult({
        fiction: {
          title: fiction.title,
          slug: fiction.slug,
          type: fiction.type,
          year: fiction.year,
          description: briefText(fiction.description),
          author: fiction.author,
          placeCount: counts[fiction.id] ?? 0,
          url: fictionCatalogUrl(fiction.slug),
        },
      })
    },
  )
}
