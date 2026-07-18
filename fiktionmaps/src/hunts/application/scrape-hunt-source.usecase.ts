import type { HuntSourcesRepositoryPort } from "@/src/hunts/domain/hunt-source.repository"

const JINA_TIMEOUT_MS = 30_000

async function fetchMarkdownWithJina(url: string): Promise<string> {
  const jinaUrl = `https://r.jina.ai/${url}`
  const response = await fetch(jinaUrl, {
    signal: AbortSignal.timeout(JINA_TIMEOUT_MS),
    headers: { Accept: "text/markdown" },
  })
  if (!response.ok) throw new Error(`Jina Reader failed: ${response.status}`)
  return response.text()
}

async function fetchMarkdownDirect(url: string): Promise<string> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(JINA_TIMEOUT_MS),
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; FiktionMapsBot/1.0; +https://fiktionmaps.com/bot)",
    },
  })
  if (!response.ok) throw new Error(`Direct fetch failed: ${response.status}`)
  return response.text()
}

export async function scrapeHuntSourceUseCase(
  sourceId: string,
  userId: string,
  huntSourcesRepo: HuntSourcesRepositoryPort,
): Promise<void> {
  const source = await huntSourcesRepo.getById(sourceId)
  if (!source) throw new Error("Hunt source not found")
  if (source.createdBy !== userId) throw new Error("Forbidden")

  // Try Jina first, fall back to direct fetch
  let markdown: string | null = null
  let provider: "jina" | "direct" = "jina"

  try {
    markdown = await fetchMarkdownWithJina(source.sourceUrl)
    provider = "jina"
  } catch (jinaErr) {
    console.warn(`[hunt/scrape] Jina failed for ${source.sourceUrl}, trying direct:`, jinaErr)
    try {
      markdown = await fetchMarkdownDirect(source.sourceUrl)
      provider = "direct"
    } catch (directErr) {
      console.error(`[hunt/scrape] Direct fetch also failed:`, directErr)
      await huntSourcesRepo.updateScrape(sourceId, "failed", null, null)
      throw new Error("Scrape failed — Jina and direct fetch both returned errors")
    }
  }

  const ok = await huntSourcesRepo.updateScrape(sourceId, "ok", markdown, provider)
  if (!ok) throw new Error("Failed to save scraped markdown")
}
