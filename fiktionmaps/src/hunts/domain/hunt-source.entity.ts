export type HuntScrapeStatus = "pending" | "ok" | "failed"
export type HuntScrapeProvider = "jina" | "direct"

export interface HuntSource {
  id: string
  fictionId: string | null
  contextLabel: string | null
  contextLabelNormalized: string | null
  sourceUrl: string
  sourceUrlNormalized: string
  scrapedMarkdown: string | null
  scrapeProvider: HuntScrapeProvider | null
  scrapeStatus: HuntScrapeStatus
  researchNote: string | null
  createdBy: string | null
  createdAt: string
  updatedAt: string
}
