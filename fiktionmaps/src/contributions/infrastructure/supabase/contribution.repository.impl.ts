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
  FictionContributionFeedItem,
  FictionContributorProfile,
  StaffFictionContributionsFeedPageResult,
  StaffFictionContributionsFeedStatusTab,
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

type ProfileEmbed = {
  id: string
  username: string | null
  full_name: string | null
  avatar_url: string | null
}

function mapFeedItem(row: ContributionRow, profiles: ProfileEmbed | ProfileEmbed[] | null): FictionContributionFeedItem | null {
  const raw = profiles
  const prof = Array.isArray(raw) ? raw[0] : raw
  if (!prof?.id) return null
  return {
    ...mapRow(row),
    contributor: {
      id: prof.id,
      username: prof.username,
      fullName: prof.full_name,
      avatarUrl: prof.avatar_url,
    },
    fictionTitle: null,
    fictionCoverUrl: null,
  }
}

async function fictionTitlesByIds(supabase: SupabaseClient<Database>, fictionIds: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(fictionIds)].filter(Boolean)
  if (unique.length === 0) return new Map()
  const { data, error } = await supabase.from("fictions").select("id, title").in("id", unique)
  if (error) {
    console.error("[contributions repo] fictionTitlesByIds:", error.message)
    return new Map()
  }
  const m = new Map<string, string>()
  for (const row of data ?? []) {
    m.set(row.id, row.title)
  }
  return m
}

async function fictionCoverThumbByIds(supabase: SupabaseClient<Database>, fictionIds: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(fictionIds)].filter(Boolean)
  if (unique.length === 0) return new Map()
  const map = new Map<string, string>()

  const { data: smRows, error: smErr } = await supabase
    .from("asset_images")
    .select("entity_id, url")
    .eq("entity_type", "fiction")
    .eq("role", "cover")
    .eq("variant", "sm")
    .in("entity_id", unique)

  if (smErr) {
    console.error("[contributions repo] fictionCoverThumbByIds sm:", smErr.message)
  } else {
    for (const row of smRows ?? []) {
      if (!map.has(row.entity_id)) map.set(row.entity_id, row.url)
    }
  }

  const missing = unique.filter((id) => !map.has(id))
  if (missing.length === 0) return map

  const { data: lgRows, error: lgErr } = await supabase
    .from("asset_images")
    .select("entity_id, url")
    .eq("entity_type", "fiction")
    .eq("role", "cover")
    .eq("variant", "lg")
    .in("entity_id", missing)

  if (lgErr) {
    console.error("[contributions repo] fictionCoverThumbByIds lg:", lgErr.message)
    return map
  }
  for (const row of lgRows ?? []) {
    if (!map.has(row.entity_id)) map.set(row.entity_id, row.url)
  }
  return map
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
  const listFictionCreateContributionsStaffReviewFeedPageCached = cache(
    async (
      userIdFilter: string | undefined,
      statusTab: StaffFictionContributionsFeedStatusTab,
      limit: number,
      offset: number,
    ): Promise<StaffFictionContributionsFeedPageResult> => {
      const supabase = await getSupabase()
      let q = supabase
        .from("contributions")
        .select(
          `
          *,
          profiles!contributions_user_id_fkey (
            id,
            username,
            full_name,
            avatar_url
          )
        `,
          { count: "exact" },
        )
        .eq("entity_type", "fiction")
        .eq("type", "create_fiction")

      if (userIdFilter) q = q.eq("user_id", userIdFilter)

      if (statusTab === "all") {
        q = q.in("status", ["pending", "approved"])
        q = q.order("status", { ascending: false }).order("created_at", { ascending: false })
      } else {
        q = q.eq("status", statusTab).order("created_at", { ascending: false })
      }

      const safeLimit = Math.max(1, limit)
      const from = Math.max(0, offset)
      const to = from + safeLimit - 1

      const { data, error, count } = await q.range(from, to)

      if (error) {
        console.error("[contributions repo] listFictionCreateContributionsStaffReviewFeedPage:", error.message)
        return { items: [], totalCount: 0 }
      }

      type Row = ContributionRow & { profiles: ProfileEmbed | ProfileEmbed[] | null }
      const items: FictionContributionFeedItem[] = []
      for (const row of (data ?? []) as Row[]) {
        const item = mapFeedItem(row, row.profiles)
        if (item) items.push(item)
      }
      const [titles, covers] = await Promise.all([
        fictionTitlesByIds(supabase, items.map((i) => i.entityId)),
        fictionCoverThumbByIds(supabase, items.map((i) => i.entityId)),
      ])
      const withMedia = items.map((i) => ({
        ...i,
        fictionTitle: titles.get(i.entityId) ?? null,
        fictionCoverUrl: covers.get(i.entityId) ?? null,
      }))

      return { items: withMedia, totalCount: count ?? 0 }
    },
  )

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

    countByUser: cache(async (userId: string): Promise<number> => {
      const supabase = await getSupabase()
      const { count, error } = await supabase
        .from("contributions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)

      if (error) {
        console.error("[contributions repo] countByUser error:", error.message)
        return 0
      }
      return count ?? 0
    }),

    sumApprovedFppAwardedByUser: cache(async (userId: string): Promise<number> => {
      const supabase = await getSupabase()
      const { data, error } = await supabase
        .from("contributions")
        .select("fpp_awarded")
        .eq("user_id", userId)
        .eq("status", "approved")
        .gt("fpp_awarded", 0)

      if (error) {
        console.error("[contributions repo] sumApprovedFppAwardedByUser error:", error.message)
        return 0
      }
      let sum = 0
      for (const row of data ?? []) {
        sum += row.fpp_awarded ?? 0
      }
      return sum
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

    listFictionCreateContributionsStaffReviewFeedPage(input) {
      const uid = input.userIdFilter?.trim()
      return listFictionCreateContributionsStaffReviewFeedPageCached(
        uid || undefined,
        input.statusTab,
        input.limit,
        input.offset,
      )
    },

    getFictionCreateContributionWithContributorById: cache(
      async (id: string): Promise<FictionContributionFeedItem | null> => {
        const supabase = await getSupabase()
        const { data, error } = await supabase
          .from("contributions")
          .select(
            `
          *,
          profiles!contributions_user_id_fkey (
            id,
            username,
            full_name,
            avatar_url
          )
        `,
          )
          .eq("id", id)
          .maybeSingle()

        if (error) {
          console.error("[contributions repo] getFictionCreateContributionWithContributorById:", error.message)
          return null
        }
        if (!data) return null

        type Row = ContributionRow & { profiles: ProfileEmbed | ProfileEmbed[] | null }
        const row = data as Row
        if (row.type !== "create_fiction" || row.entity_type !== "fiction") return null
        const base = mapFeedItem(row, row.profiles)
        if (!base) return null
        const [titles, covers] = await Promise.all([
          fictionTitlesByIds(supabase, [base.entityId]),
          fictionCoverThumbByIds(supabase, [base.entityId]),
        ])
        return {
          ...base,
          fictionTitle: titles.get(base.entityId) ?? null,
          fictionCoverUrl: covers.get(base.entityId) ?? null,
        }
      },
    ),

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
