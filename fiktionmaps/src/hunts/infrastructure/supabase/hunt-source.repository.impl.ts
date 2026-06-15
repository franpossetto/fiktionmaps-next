import { createClient } from "@/lib/supabase/server"
import type { HuntSource, HuntScrapeStatus } from "@/src/hunts/domain/hunt-source.entity"
import type {
  HuntSourcesRepositoryPort,
  CreateHuntSourceData,
} from "@/src/hunts/domain/hunt-source.repository"

function normalizeUrl(url: string): string {
  try {
    const u = new URL(url.trim())
    // Remove trailing slash, lowercase host, keep path+search
    return `${u.protocol}//${u.host.toLowerCase()}${u.pathname.replace(/\/$/, "")}${u.search}`
  } catch {
    return url.trim().toLowerCase()
  }
}

function normalizeLabel(label: string): string {
  return label.trim().toLowerCase().replace(/\s+/g, " ")
}

function mapRow(row: {
  id: string
  fiction_id: string | null
  context_label: string | null
  context_label_normalized: string | null
  source_url: string
  source_url_normalized: string
  scraped_markdown: string | null
  scrape_provider: string | null
  scrape_status: string
  research_note: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}): HuntSource {
  return {
    id: row.id,
    fictionId: row.fiction_id,
    contextLabel: row.context_label,
    contextLabelNormalized: row.context_label_normalized,
    sourceUrl: row.source_url,
    sourceUrlNormalized: row.source_url_normalized,
    scrapedMarkdown: row.scraped_markdown,
    scrapeProvider: (row.scrape_provider as HuntSource["scrapeProvider"]) ?? null,
    scrapeStatus: row.scrape_status as HuntScrapeStatus,
    researchNote: row.research_note,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function getHuntSourceById(id: string): Promise<HuntSource | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("hunt_sources")
    .select("*")
    .eq("id", id)
    .single()
  if (error || !data) return null
  return mapRow(data)
}

export async function listHuntSourcesByCreatedBy(userId: string): Promise<HuntSource[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("hunt_sources")
    .select("*")
    .eq("created_by", userId)
    .order("created_at", { ascending: false })
  if (error || !data) return []
  return data.map(mapRow)
}

export async function listHuntSourcesByFictionId(fictionId: string): Promise<HuntSource[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("hunt_sources")
    .select("*")
    .eq("fiction_id", fictionId)
    .order("created_at", { ascending: false })
  if (error || !data) return []
  return data.map(mapRow)
}

export async function createHuntSource(data: CreateHuntSourceData): Promise<HuntSource | null> {
  const supabase = await createClient()
  const sourceUrlNormalized = normalizeUrl(data.sourceUrl)
  const { data: row, error } = await supabase
    .from("hunt_sources")
    .insert({
      fiction_id: data.fictionId,
      context_label: data.contextLabel,
      context_label_normalized: data.contextLabel ? normalizeLabel(data.contextLabel) : null,
      source_url: data.sourceUrl,
      source_url_normalized: sourceUrlNormalized,
      research_note: data.researchNote ?? null,
      created_by: data.createdBy,
    })
    .select()
    .single()
  if (error || !row) return null
  return mapRow(row)
}

export async function updateHuntSourceScrape(
  id: string,
  scrapeStatus: HuntScrapeStatus,
  markdown: string | null,
  provider: string | null,
): Promise<boolean> {
  const supabase = await createClient()
  const { error } = await supabase
    .from("hunt_sources")
    .update({
      scrape_status: scrapeStatus,
      scraped_markdown: markdown,
      scrape_provider: provider,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
  return !error
}

export async function deleteHuntSource(id: string): Promise<boolean> {
  const supabase = await createClient()
  const { error } = await supabase.from("hunt_sources").delete().eq("id", id)
  return !error
}

export const huntSourcesSupabaseAdapter: HuntSourcesRepositoryPort = {
  getById: getHuntSourceById,
  listByCreatedBy: listHuntSourcesByCreatedBy,
  listByFictionId: listHuntSourcesByFictionId,
  create: createHuntSource,
  updateScrape: updateHuntSourceScrape,
  delete: deleteHuntSource,
}
