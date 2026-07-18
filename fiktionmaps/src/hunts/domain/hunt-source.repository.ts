import type { HuntSource, HuntScrapeStatus } from "./hunt-source.entity"

export interface CreateHuntSourceData {
  fictionId: string | null
  contextLabel: string | null
  sourceUrl: string
  researchNote?: string
  createdBy: string
}

export interface UpdateHuntSourceScrapeData {
  scraped_markdown: string | null
  scrape_provider: HuntScrapeStatus extends "ok" ? string : string
  scrape_status: HuntScrapeStatus
}

export interface HuntSourcesRepositoryPort {
  getById(id: string): Promise<HuntSource | null>
  listByCreatedBy(userId: string): Promise<HuntSource[]>
  listByFictionId(fictionId: string): Promise<HuntSource[]>
  create(data: CreateHuntSourceData): Promise<HuntSource | null>
  updateScrape(id: string, scrapeStatus: HuntScrapeStatus, markdown: string | null, provider: string | null): Promise<boolean>
  updateFictionId(id: string, fictionId: string): Promise<boolean>
  delete(id: string): Promise<boolean>
}
