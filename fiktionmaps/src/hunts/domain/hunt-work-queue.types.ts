import type { HuntStatus } from "./hunt.entity"
import type { HuntScrapeStatus } from "./hunt-source.entity"

export interface HuntWorkQueueItem {
  huntId: string
  huntSourceId: string
  huntStatus: HuntStatus
  huntCreatedAt: string
  huntUpdatedAt: string
  extracted: number
  shortlisted: number
  posted: number
  skipped: number
  sourceUrl: string
  scrapeStatus: HuntScrapeStatus
  contextLabel: string | null
  fictionId: string | null
  fictionTitle: string | null
}
