import { z } from "zod"
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { getPublicFictionByIdUseCase } from "@/src/fictions/application/get-public-fiction-by-id.usecase"
import { getPublicFictionBySlugUseCase } from "@/src/fictions/application/get-public-fiction-by-slug.usecase"
import { listPublicScenesUseCase } from "@/src/scenes/application/list-public-scenes.usecase"
import { fictionsRepoPublic } from "@/src/shared/infrastructure/supabase/anon-repos"
import { scenesRepoPublic } from "@/src/scenes/infrastructure/supabase/scene.repository.impl"
import { briefText, catalogToolResult } from "@/src/mcp/catalog-tool-result"
import { sceneCatalogUrl } from "@/src/mcp/catalog-urls"

export const LIST_SCENES_TOOL = "list_scenes"

export function registerSceneCatalogTools(server: McpServer): void {
  server.registerTool(
    LIST_SCENES_TOOL,
    {
      title: "List published scenes",
      description:
        "List approved, active scenes for a published fiction (by slug) or for one place (by place id). Scenes whose fiction is inactive or not approved are omitted. Provide fictionSlug or placeId.",
      inputSchema: {
        fictionSlug: z.string().trim().min(1).optional().describe("Fiction slug. Use this or placeId."),
        placeId: z.string().uuid().optional().describe("Place id. Use this or fictionSlug."),
      },
    },
    async ({ fictionSlug, placeId }) => {
      if (!fictionSlug && !placeId) return catalogToolResult({ scenes: [] })

      let fictionId: string | undefined
      if (fictionSlug) {
        const fiction = await getPublicFictionBySlugUseCase(fictionSlug, fictionsRepoPublic)
        if (!fiction) return catalogToolResult({ scenes: [] })
        fictionId = fiction.id
      }

      const scenes = await listPublicScenesUseCase(
        { fictionId, placeId },
        { scenes: scenesRepoPublic, fictions: fictionsRepoPublic },
      )

      const slugs = new Map<string, string>()
      await Promise.all(
        [...new Set(scenes.map((scene) => scene.fictionId))].map(async (id) => {
          const fiction = await getPublicFictionByIdUseCase(id, fictionsRepoPublic)
          if (fiction) slugs.set(id, fiction.slug)
        }),
      )

      return catalogToolResult({
        scenes: scenes.flatMap((scene) => {
          const fictionSlugForScene = slugs.get(scene.fictionId)
          if (!fictionSlugForScene) return []
          return [
            {
              id: scene.id,
              title: scene.title,
              description: briefText(scene.description),
              quote: scene.quote ?? null,
              timestamp: scene.timestamp ?? null,
              season: scene.season ?? null,
              episode: scene.episode ?? null,
              placeIds: scene.places.map((place) => place.placeId),
              url: sceneCatalogUrl(fictionSlugForScene, scene.id),
            },
          ]
        }),
      })
    },
  )
}
