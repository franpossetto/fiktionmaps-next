import { cache } from "react"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { ContributionRow, Database } from "@/supabase/database.types"
import { createClient } from "@/lib/supabase/server"
import {
  CONTRIBUTION_FPP,
  ENTITY_PATCH_ON_CONTRIBUTION_APPROVE,
} from "@/src/contributions/domain/contribution.config"
import type {
  Contribution,
  ContributionEntityType,
  ContributionType,
  ContributorProfileWithDate,
  FictionContributorProfile,
  TopContributorProfile,
} from "@/src/contributions/domain/contribution.entity"
import type { ContributionsRepositoryPort } from "@/src/contributions/domain/contribution.repository"
import type {
  ApproveContributionInput,
  CreateContributionInput,
  RejectContributionInput,
} from "@/src/contributions/domain/contribution.schemas"

function mapRow(row: ContributionRow): Contribution {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    entityType: row.entity_type,
    entityId: row.entity_id,
    status: row.status,
    moderatorId: row.moderator_id,
    moderatorNote: row.moderator_note,
    fppAwarded: row.fpp_awarded,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function entityTable(entityType: ContributionEntityType): "fictions" | "places" | "scenes" {
  switch (entityType) {
    case "fiction":
      return "fictions"
    case "place":
      return "places"
    case "scene":
      return "scenes"
  }
}

export function createContributionsSupabaseAdapter(
  getSupabase: () => Promise<SupabaseClient<Database>>,
): ContributionsRepositoryPort {
  return {
    async create(input: CreateContributionInput): Promise<{ contributionId: string } | null> {
      const supabase = await getSupabase()
      const { data, error } = await supabase
        .from("contributions")
        .insert({
          user_id: input.userId,
          type: input.type,
          entity_type: input.entityType,
          entity_id: input.entityId,
        })
        .select("id")
        .maybeSingle()

      if (error || !data?.id) {
        console.error("[contributions repo] create error:", error?.message)
        return null
      }
      return { contributionId: data.id }
    },

    getById: cache(async (id: string): Promise<Contribution | null> => {
      const supabase = await getSupabase()
      const { data, error } = await supabase.from("contributions").select("*").eq("id", id).maybeSingle()
      if (error) {
        console.error("[contributions repo] getById error:", error.message)
        return null
      }
      return data ? mapRow(data as ContributionRow) : null
    }),

    getByUser: cache(async (userId: string): Promise<Contribution[]> => {
      const supabase = await getSupabase()
      const { data, error } = await supabase
        .from("contributions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("[contributions repo] getByUser error:", error.message)
        return []
      }
      return (data as ContributionRow[] | null)?.map(mapRow) ?? []
    }),

    getApprovedByEntity: cache(
      async (entityType: ContributionEntityType, entityId: string): Promise<Contribution[]> => {
        const supabase = await getSupabase()
        const { data, error } = await supabase
          .from("contributions")
          .select("*")
          .eq("entity_type", entityType)
          .eq("entity_id", entityId)
          .eq("status", "approved")
          .order("created_at", { ascending: false })

        if (error) {
          console.error("[contributions repo] getApprovedByEntity error:", error.message)
          return []
        }
        return (data as ContributionRow[] | null)?.map(mapRow) ?? []
      },
    ),

    listApprovedProfilesForEntity: cache(
      async (
        entityType: ContributionEntityType,
        entityId: string,
      ): Promise<FictionContributorProfile[]> => {
      const supabase = await getSupabase()
      const { data, error } = await supabase
        .from("contributions")
        .select(
          `
          user_id,
          profiles!contributions_user_id_fkey (
            id,
            username,
            full_name,
            avatar_url
          )
        `,
        )
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .eq("status", "approved")

      if (error) {
        console.error("[contributions repo] listApprovedProfilesForEntity:", error.message)
        return []
      }

      type ProfileEmbed = {
        id: string
        username: string | null
        full_name: string | null
        avatar_url: string | null
      }
      type Row = { profiles: ProfileEmbed | ProfileEmbed[] | null }

      const out: FictionContributorProfile[] = []
      for (const row of (data ?? []) as Row[]) {
        const raw = row.profiles
        const prof = Array.isArray(raw) ? raw[0] : raw
        if (!prof?.id) continue
        out.push({
          id: prof.id,
          username: prof.username,
          fullName: prof.full_name,
          avatarUrl: prof.avatar_url,
        })
      }
      return out
    }),

    listApprovedContributorProfilesFirstContributionAt: cache(
      async (
        entityType: ContributionEntityType,
        entityId: string,
      ): Promise<ContributorProfileWithDate[]> => {
        const supabase = await getSupabase()
        const { data, error } = await supabase
          .from("contributions")
          .select(
            `
          user_id,
          created_at,
          profiles!contributions_user_id_fkey (
            id,
            username,
            full_name,
            avatar_url
          )
        `,
          )
          .eq("entity_type", entityType)
          .eq("entity_id", entityId)
          .eq("status", "approved")
          .order("created_at", { ascending: true })

        if (error) {
          console.error("[contributions repo] listApprovedContributorProfilesFirstContributionAt:", error.message)
          return []
        }

        type ProfileEmbed = {
          id: string
          username: string | null
          full_name: string | null
          avatar_url: string | null
        }
        type Row = {
          user_id: string
          created_at: string
          profiles: ProfileEmbed | ProfileEmbed[] | null
        }

        const seen = new Set<string>()
        const out: ContributorProfileWithDate[] = []
        for (const row of (data ?? []) as Row[]) {
          if (seen.has(row.user_id)) continue
          seen.add(row.user_id)
          const raw = row.profiles
          const prof = Array.isArray(raw) ? raw[0] : raw
          if (!prof?.id) continue
          out.push({
            id: prof.id,
            username: prof.username,
            fullName: prof.full_name,
            avatarUrl: prof.avatar_url,
            contributedAt: row.created_at,
          })
        }
        return out
    }),

    getPending: cache(async (): Promise<Contribution[]> => {
      const supabase = await getSupabase()
      const { data, error } = await supabase
        .from("contributions")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: true })

      if (error) {
        console.error("[contributions repo] getPending error:", error.message)
        return []
      }
      return (data as ContributionRow[] | null)?.map(mapRow) ?? []
    }),

    listTopContributors: cache(async (limit: number): Promise<TopContributorProfile[]> => {
      const supabase = await getSupabase()
      const { data, error } = await supabase
        .from("contributions")
        .select(
          `
          user_id,
          fpp_awarded,
          profiles!contributions_user_id_fkey (
            id,
            username,
            full_name,
            avatar_url
          )
        `,
        )
        .eq("status", "approved")
        .gt("fpp_awarded", 0)

      if (error) {
        console.error("[contributions repo] listTopContributors error:", error.message)
        return []
      }

      type ProfileEmbed = {
        id: string
        username: string | null
        full_name: string | null
        avatar_url: string | null
      }
      type Row = { user_id: string; fpp_awarded: number | null; profiles: ProfileEmbed | ProfileEmbed[] | null }

      const totals = new Map<string, { profile: FictionContributorProfile; fppTotal: number }>()
      for (const row of (data ?? []) as Row[]) {
        const raw = row.profiles
        const prof = Array.isArray(raw) ? raw[0] : raw
        if (!prof?.id) continue
        const existing = totals.get(prof.id)
        if (existing) {
          existing.fppTotal += row.fpp_awarded ?? 0
        } else {
          totals.set(prof.id, {
            profile: { id: prof.id, username: prof.username, fullName: prof.full_name, avatarUrl: prof.avatar_url },
            fppTotal: row.fpp_awarded ?? 0,
          })
        }
      }

      return [...totals.values()]
        .sort((a, b) => b.fppTotal - a.fppTotal)
        .slice(0, limit)
        .map(({ profile, fppTotal }) => ({ ...profile, fppTotal }))
    }),

    async approve(input: ApproveContributionInput): Promise<boolean> {
      const supabase = await getSupabase()
      const { data: row, error: fetchErr } = await supabase
        .from("contributions")
        .select("*")
        .eq("id", input.id)
        .maybeSingle()

      if (fetchErr || !row) {
        console.error("[contributions repo] approve fetch:", fetchErr?.message)
        return false
      }

      const contribRow = row as ContributionRow
      if (contribRow.status !== "pending") return false

      const contributionType = contribRow.type as ContributionType
      const fppAwarded = input.fppAwarded ?? CONTRIBUTION_FPP[contributionType]
      const authorId = contribRow.user_id
      const entityType = contribRow.entity_type as ContributionEntityType
      const entityId = contribRow.entity_id
      const now = new Date().toISOString()

      const { error: contribErr } = await supabase
        .from("contributions")
        .update({
          status: "approved",
          fpp_awarded: fppAwarded,
          moderator_id: input.moderatorId,
          updated_at: now,
        })
        .eq("id", input.id)

      if (contribErr) {
        console.error("[contributions repo] approve update contribution:", contribErr.message)
        return false
      }

      const table = entityTable(entityType)
      const { error: entityErr } = await supabase
        .from(table)
        .update({
          ...ENTITY_PATCH_ON_CONTRIBUTION_APPROVE,
          updated_at: now,
        })
        .eq("id", entityId)

      if (entityErr) {
        console.error("[contributions repo] approve update entity:", entityErr.message)
        return false
      }

      const { data: profile, error: profileFetchErr } = await supabase
        .from("profiles")
        .select("fpp_total")
        .eq("id", authorId)
        .maybeSingle()

      if (profileFetchErr || profile == null) {
        console.error("[contributions repo] approve fetch profile:", profileFetchErr?.message)
        return false
      }

      const nextTotal = (profile.fpp_total ?? 0) + fppAwarded
      // TODO: level thresholds to be defined — derive level from fpp_total
      const { error: profileUpdateErr } = await supabase
        .from("profiles")
        .update({
          fpp_total: nextTotal,
          updated_at: now,
        })
        .eq("id", authorId)

      if (profileUpdateErr) {
        console.error("[contributions repo] approve update profile fpp:", profileUpdateErr.message)
        return false
      }

      return true
    },

    async reject(input: RejectContributionInput): Promise<boolean> {
      const supabase = await getSupabase()
      const { data: row, error: fetchErr } = await supabase
        .from("contributions")
        .select("id, status, entity_type, entity_id")
        .eq("id", input.id)
        .maybeSingle()

      if (fetchErr || !row) {
        console.error("[contributions repo] reject fetch:", fetchErr?.message)
        return false
      }

      const r = row as Pick<ContributionRow, "status" | "entity_type" | "entity_id">
      if (r.status !== "pending") return false

      const entityType = r.entity_type as ContributionEntityType
      const entityId = r.entity_id
      const now = new Date().toISOString()

      const { error: contribErr } = await supabase
        .from("contributions")
        .update({
          status: "rejected",
          moderator_id: input.moderatorId,
          moderator_note: input.moderatorNote ?? null,
          updated_at: now,
        })
        .eq("id", input.id)

      if (contribErr) {
        console.error("[contributions repo] reject update contribution:", contribErr.message)
        return false
      }

      const table = entityTable(entityType)
      const { error: entityErr } = await supabase
        .from(table)
        .update({
          status: "rejected",
          updated_at: now,
        })
        .eq("id", entityId)

      if (entityErr) {
        console.error("[contributions repo] reject update entity:", entityErr.message)
        return false
      }

      return true
    },
  }
}

export const supabaseRepositoryAdapter = createContributionsSupabaseAdapter(createClient)
