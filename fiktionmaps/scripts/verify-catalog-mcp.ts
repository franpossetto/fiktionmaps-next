import assert from "node:assert/strict"
import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js"
import type { Fiction, FictionWithMedia } from "../src/fictions/domain/fiction.entity"
import { getPublicFictionByIdUseCase } from "../src/fictions/application/get-public-fiction-by-id.usecase"
import { getPublicFictionBySlugUseCase } from "../src/fictions/application/get-public-fiction-by-slug.usecase"
import { searchPublicCatalogUseCase } from "../src/places/application/search-public-catalog.usecase"
import type { PublicCatalogPlaceMatch } from "../src/places/domain/public-catalog-search"
import { listPublicScenesUseCase } from "../src/scenes/application/list-public-scenes.usecase"
import type { Scene } from "../src/scenes/domain/scene.entity"
import { CATALOG_TOOL_NAMES, createCatalogMcpServer } from "../src/mcp/register-catalog-tools"

function fiction(overrides: Partial<Fiction> = {}): Fiction {
  return {
    id: "fic-1",
    title: "Inception",
    type: "movie",
    year: 2010,
    author: null,
    genre: "thriller",
    description: "A dream heist.",
    active: true,
    slug: "inception",
    created_at: "2020-01-01T00:00:00.000Z",
    updated_at: "2020-01-01T00:00:00.000Z",
    ...overrides,
  }
}

function place(overrides: Partial<PublicCatalogPlaceMatch> = {}): PublicCatalogPlaceMatch {
  return {
    placeId: "place-1",
    placeName: "Empire State Building",
    placeSlug: "empire-state-building",
    description: "The deck.",
    lat: 40.7,
    lng: -73.9,
    cityName: "New York",
    country: "United States",
    fictionId: "fic-1",
    fictionTitle: "Inception",
    fictionSlug: "inception",
    fictionYear: 2010,
    fictionType: "movie",
    fictionDescription: "A dream heist.",
    ...overrides,
  }
}

function scene(id: string, fictionId: string): Scene {
  return {
    id,
    fictionId,
    places: [],
    title: id,
    description: "",
    sortOrder: 0,
    active: true,
    videoUrl: null,
    previewUrl: null,
  }
}

async function testSearchRanking() {
  const empire = place()
  const parisCafe = place({
    placeId: "place-paris",
    placeName: "Cafe de Flore",
    placeSlug: "cafe-de-flore",
    cityName: "Paris",
    country: "France",
    fictionId: "fic-paris",
    fictionTitle: "Midnight in Paris",
    fictionSlug: "midnight-in-paris",
    fictionYear: 2011,
    fictionDescription: "Walks in Paris.",
  })
  const titleOnly = fiction({ id: "fic-title", title: "The Empire Strikes Back", slug: "empire" })

  const hits = await searchPublicCatalogUseCase("empire", {
    places: {
      async searchApprovedActiveByName() {
        return [empire, parisCafe]
      },
      async searchApprovedActiveByCityName() {
        return [empire, parisCafe]
      },
    },
    fictions: {
      async searchApprovedActiveByTitle() {
        return [fiction(), titleOnly]
      },
    },
  })

  assert.deepEqual(
    hits.map((hit) => (hit.kind === "place" ? `${hit.match}:${hit.placeId}` : `${hit.match}:${hit.fictionId}`)),
    [
      "place_name:place-1",
      "place_name:place-paris",
      "fiction_title:fic-1",
      "fiction_title:fic-title",
      "city:fic-paris",
    ],
  )
  assert.equal(hits.some((hit) => !("kind" in hit)), false)
  assert.equal(
    hits.some((hit) => hit.kind === "place" && hit.placeId === "place-1" && hit.match !== "place_name"),
    false,
  )
}

async function testSearchGlobalLimit() {
  const places = Array.from({ length: 20 }, (_, index) =>
    place({ placeId: `p-${index}`, placeName: `Place ${index}`, placeSlug: `place-${index}` }),
  )
  const hits = await searchPublicCatalogUseCase("place", {
    places: {
      async searchApprovedActiveByName() {
        return places
      },
      async searchApprovedActiveByCityName() {
        return [place({ placeId: "city-only", placeName: "Somewhere", fictionId: "fic-city" })]
      },
    },
    fictions: {
      async searchApprovedActiveByTitle() {
        return [fiction({ id: "fic-extra", title: "Extra" })]
      },
    },
  })
  assert.equal(hits.length, 20)
  assert.ok(hits.every((hit) => hit.kind === "place" && hit.match === "place_name"))
}

async function testSearchEmptyQuerySkipsRepos() {
  const hits = await searchPublicCatalogUseCase("   ", {
    places: {
      async searchApprovedActiveByName() {
        throw new Error("should not query")
      },
      async searchApprovedActiveByCityName() {
        throw new Error("should not query")
      },
    },
    fictions: {
      async searchApprovedActiveByTitle() {
        throw new Error("should not query")
      },
    },
  })
  assert.deepEqual(hits, [])
}

async function testInactiveFictionBySlugAndId() {
  const hidden = { ...fiction({ id: "hidden", active: false, slug: "hidden" }), } satisfies FictionWithMedia
  const slugResult = await getPublicFictionBySlugUseCase("hidden", {
    async getBySlug() {
      return hidden
    },
    async isApprovedActiveFiction() {
      return false
    },
  })
  assert.equal(slugResult, null)

  let getByIdCalls = 0
  const idResult = await getPublicFictionByIdUseCase("hidden", {
    async getById() {
      getByIdCalls += 1
      return hidden
    },
    async isApprovedActiveFiction() {
      return false
    },
  })
  assert.equal(idResult, null)
  assert.equal(getByIdCalls, 0)
}

async function testScenesRequireApprovedActiveFiction() {
  let listCalls = 0
  const scenes = await listPublicScenesUseCase(
    { placeId: "place-1" },
    {
      scenes: {
        async list() {
          listCalls += 1
          return [scene("s-visible", "fic-visible"), scene("s-hidden", "fic-hidden")]
        },
      },
      fictions: {
        async isApprovedActiveFiction(id) {
          return id === "fic-visible"
        },
      },
    },
  )
  assert.deepEqual(
    scenes.map((row) => row.id),
    ["s-visible"],
  )

  const hidden = await listPublicScenesUseCase(
    { fictionId: "fic-hidden" },
    {
      scenes: {
        async list() {
          listCalls += 1
          return [scene("s-hidden", "fic-hidden")]
        },
      },
      fictions: {
        async isApprovedActiveFiction() {
          return false
        },
      },
    },
  )
  assert.deepEqual(hidden, [])
  assert.equal(listCalls, 1)
}

async function testRegisteredToolsAreReadOnly() {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
  const server = createCatalogMcpServer()
  await server.connect(serverTransport)
  const client = new Client({ name: "verify-catalog-mcp", version: "0.0.0" })
  await client.connect(clientTransport)
  const listed = await client.listTools()
  const names = listed.tools.map((tool) => tool.name).sort()
  assert.deepEqual(names, [...CATALOG_TOOL_NAMES].sort())
  for (const name of names) {
    assert.equal(/create|update|delete|approve|reject|insert/.test(name), false)
  }
  await client.close()
  await server.close()
}

async function main() {
  await testSearchRanking()
  await testSearchGlobalLimit()
  await testSearchEmptyQuerySkipsRepos()
  await testInactiveFictionBySlugAndId()
  await testScenesRequireApprovedActiveFiction()
  await testRegisteredToolsAreReadOnly()
  console.log("catalog mcp checks passed")
}

main()
