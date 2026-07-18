import { createClient } from "@/lib/supabase/server"
import type { Hunt, HuntStatus, HuntPayload, HuntStats } from "@/src/hunts/domain/hunt.entity"
import { normalizeHuntPayload } from "@/src/hunts/domain/hunt-place.helpers"
import type {
  HuntsRepositoryPort,
  CreateHuntData,
} from "@/src/hunts/domain/hunt.repository"

function mapRow(row: {
  id: string
  hunt_source_id: string
  payload: unknown
  status: string
  outcome: string | null
  hunter_note: string | null
  stats: unknown
  created_by: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
  updated_at: string
}): Hunt {
  return {
    id: row.id,
    huntSourceId: row.hunt_source_id,
    payload: normalizeHuntPayload(row.payload ?? { places: [] }),
    status: row.status as HuntStatus,
    outcome: (row.outcome as Hunt["outcome"]) ?? null,
    hunterNote: row.hunter_note,
    stats: (row.stats ?? {}) as Partial<HuntStats>,
    createdBy: row.created_by,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function getHuntById(id: string): Promise<Hunt | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("hunts")
    .select("*")
    .eq("id", id)
    .single()
  if (error || !data) return null
  return mapRow(data)
}

export async function listHuntsBySourceId(sourceId: string): Promise<Hunt[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("hunts")
    .select("*")
    .eq("hunt_source_id", sourceId)
    .order("created_at", { ascending: false })
  if (error || !data) return []
  return data.map(mapRow)
}

export async function listHuntsByCreatedBy(userId: string): Promise<Hunt[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("hunts")
    .select("*")
    .eq("created_by", userId)
    .order("created_at", { ascending: false })
  if (error || !data) return []
  return data.map(mapRow)
}

export async function createHunt(data: CreateHuntData): Promise<Hunt | null> {
  const supabase = await createClient()
  const { data: row, error } = await supabase
    .from("hunts")
    .insert({
      hunt_source_id: data.huntSourceId,
      payload: data.payload as never,
      created_by: data.createdBy,
      ...(data.stats ? { stats: data.stats as never } : {}),
    })
    .select()
    .single()
  if (error || !row) return null
  return mapRow(row)
}

export async function updateHuntPayload(id: string, payload: HuntPayload): Promise<boolean> {
  const supabase = await createClient()
  const { error } = await supabase
    .from("hunts")
    .update({
      payload: payload as never,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
  return !error
}

export async function updateHuntPayloadAndStatus(
  id: string,
  payload: HuntPayload,
  status: HuntStatus,
  stats: Partial<HuntStats>,
  hunterNote?: string | null,
): Promise<boolean> {
  const supabase = await createClient()
  const { error } = await supabase
    .from("hunts")
    .update({
      payload: payload as never,
      status,
      stats: stats as never,
      hunter_note: hunterNote ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
  return !error
}

export async function updateHuntReviewDraft(
  id: string,
  payload: HuntPayload,
  hunterNote?: string | null,
): Promise<boolean> {
  const supabase = await createClient()
  const { error } = await supabase
    .from("hunts")
    .update({
      payload: payload as never,
      hunter_note: hunterNote ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
  return !error
}

export async function deleteHunt(id: string): Promise<boolean> {
  const supabase = await createClient()
  const { error } = await supabase.from("hunts").delete().eq("id", id)
  return !error
}

export const huntsSupabaseAdapter: HuntsRepositoryPort = {
  getById: getHuntById,
  listBySourceId: listHuntsBySourceId,
  listByCreatedBy: listHuntsByCreatedBy,
  create: createHunt,
  updatePayloadAndStatus: updateHuntPayloadAndStatus,
  updatePayload: updateHuntPayload,
  updateReviewDraft: updateHuntReviewDraft,
  delete: deleteHunt,
}
