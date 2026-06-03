import { cache } from "react"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { ContributionPendingImageRow, ContributionRow, Database } from "@/supabase/database.types"
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
  PlaceContributionFeedItem,
  StaffContributionsFeedKind,
  StaffCreateContributionFeedItem,
  StaffCreateContributionsFeedPageResult,
  StaffFictionContributionsFeedPageResult,
  StaffFictionContributionsFeedStatusTab,
  TopContributorProfile,
} from "@/src/contributions/domain/contribution.entity"
import type { ContributionsRepositoryPort } from "@/src/contributions/domain/contribution.repository"
import type { InsertContributionPendingPlaceImagesInput } from "@/src/contributions/domain/contribution.repository"
import type {
  ApproveContributionInput,
  CreateContributionInput,
  RejectContributionInput,
} from "@/src/contributions/domain/contribution.schemas"
import {
  promotePendingPlacePhotoToAssetImages,
  removePendingContributionStoragePaths,
} from "@/lib/asset-images/pending-contribution-image"
import {
  pendingImagesToSnapshot,
  type ContributionPendingImage,
} from "@/src/contributions/domain/contribution.entity"

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

function isCreateContributionType(type: ContributionType): boolean {
  return type === "create_fiction" || type === "create_place"
}

type ProfileEmbed = {
  id: string
  username: string | null
  full_name: string | null
  avatar_url: string | null
}

function mapFictionFeedItem(
  row: ContributionRow,
  profiles: ProfileEmbed | ProfileEmbed[] | null,
): FictionContributionFeedItem | null {
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

function mapPlaceFeedItem(
  row: ContributionRow,
  profiles: ProfileEmbed | ProfileEmbed[] | null,
): PlaceContributionFeedItem | null {
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
    placeName: null,
    placeAvatarUrl: null,
    fictionTitle: null,
    fictionId: null,
    pendingImages: null,
  }
}

function mapPendingImageRow(row: ContributionPendingImageRow): ContributionPendingImage {
  return {
    id: row.id,
    contributionId: row.contribution_id,
    role: row.role,
    variant: row.variant,
    storagePath: row.storage_path,
    createdAt: row.created_at,
  }
}

async function listPendingImagesForContributionIds(
  supabase: SupabaseClient<Database>,
  contributionIds: string[],
): Promise<Map<string, ContributionPendingImage[]>> {
  const unique = [...new Set(contributionIds)].filter(Boolean)
  const map = new Map<string, ContributionPendingImage[]>()
  if (unique.length === 0) return map

  const { data, error } = await supabase
    .from("contribution_pending_images")
    .select("*")
    .in("contribution_id", unique)

  if (error) {
    console.error("[contributions repo] listPendingImagesForContributionIds:", error.message)
    return map
  }

  for (const row of data ?? []) {
    const cid = row.contribution_id
    const list = map.get(cid) ?? []
    list.push(mapPendingImageRow(row as ContributionPendingImageRow))
    map.set(cid, list)
  }
  return map
}

type PlaceMeta = { name: string | null; fictionId: string }

async function placeMetaByIds(
  supabase: SupabaseClient<Database>,
  placeIds: string[],
): Promise<Map<string, PlaceMeta>> {
  const unique = [...new Set(placeIds)].filter(Boolean)
  if (unique.length === 0) return new Map()
  const { data, error } = await supabase.from("places").select("id, name, fiction_id").in("id", unique)
  if (error) {
    console.error("[contributions repo] placeMetaByIds:", error.message)
    return new Map()
  }
  const m = new Map<string, PlaceMeta>()
  for (const row of data ?? []) {
    m.set(row.id, { name: row.name, fictionId: row.fiction_id })
  }
  return m
}

async function assetThumbByEntityIds(
  supabase: SupabaseClient<Database>,
  entityType: "fiction" | "place",
  role: "cover" | "avatar",
  entityIds: string[],
): Promise<Map<string, string>> {
  const unique = [...new Set(entityIds)].filter(Boolean)
  if (unique.length === 0) return new Map()
  const map = new Map<string, string>()

  const { data, error } = await supabase
    .from("asset_images")
    .select("entity_id, url, variant")
    .eq("entity_type", entityType)
    .eq("role", role)
    .in("variant", ["sm", "lg"])
    .in("entity_id", unique)

  if (error) {
    console.error(`[contributions repo] assetThumbByEntityIds ${entityType}/${role}:`, error.message)
    return map
  }

  for (const row of data ?? []) {
    if (row.variant === "sm" && !map.has(row.entity_id)) {
      map.set(row.entity_id, row.url)
    }
  }
  for (const row of data ?? []) {
    if (!map.has(row.entity_id) && row.variant === "lg") {
      map.set(row.entity_id, row.url)
    }
  }
  return map
}

async function fictionCoverThumbByIds(supabase: SupabaseClient<Database>, fictionIds: string[]): Promise<Map<string, string>> {
  return assetThumbByEntityIds(supabase, "fiction", "cover", fictionIds)
}

async function placeAvatarThumbByIds(supabase: SupabaseClient<Database>, placeIds: string[]): Promise<Map<string, string>> {
  return assetThumbByEntityIds(supabase, "place", "avatar", placeIds)
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

async function enrichFictionFeedItem(
  supabase: SupabaseClient<Database>,
  base: FictionContributionFeedItem,
): Promise<FictionContributionFeedItem> {
  const [titles, covers] = await Promise.all([
    fictionTitlesByIds(supabase, [base.entityId]),
    fictionCoverThumbByIds(supabase, [base.entityId]),
  ])
  return {
    ...base,
    fictionTitle: titles.get(base.entityId) ?? null,
    fictionCoverUrl: covers.get(base.entityId) ?? null,
  }
}

async function enrichPlaceFeedItem(
  supabase: SupabaseClient<Database>,
  base: PlaceContributionFeedItem,
): Promise<PlaceContributionFeedItem> {
  const [meta, avatars] = await Promise.all([
    placeMetaByIds(supabase, [base.entityId]),
    placeAvatarThumbByIds(supabase, [base.entityId]),
  ])
  const placeMetaRow = meta.get(base.entityId)
  const fid = placeMetaRow?.fictionId ?? null
  const fictionTitles = fid ? await fictionTitlesByIds(supabase, [fid]) : new Map<string, string>()
  const pendingMap =
    base.type === "add_photo"
      ? await listPendingImagesForContributionIds(supabase, [base.id])
      : new Map<string, ContributionPendingImage[]>()
  const pendingRows = pendingMap.get(base.id) ?? []
  return {
    ...base,
    placeName: placeMetaRow?.name ?? null,
    placeAvatarUrl: avatars.get(base.entityId) ?? null,
    fictionId: fid,
    fictionTitle: fid ? (fictionTitles.get(fid) ?? null) : null,
    pendingImages: pendingImagesToSnapshot(pendingRows),
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
        const item = mapFictionFeedItem(row, row.profiles)
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

  const listCreateContributionsStaffReviewFeedPageCached = cache(
    async (
      kind: StaffContributionsFeedKind,
      userIdFilter: string | undefined,
      statusTab: StaffFictionContributionsFeedStatusTab,
      limit: number,
      offset: number,
    ): Promise<StaffCreateContributionsFeedPageResult> => {
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

      if (kind === "fiction") {
        q = q.eq("entity_type", "fiction").eq("type", "create_fiction")
      } else if (kind === "place") {
        q = q.eq("entity_type", "place").in("type", ["create_place", "add_photo"])
      } else {
        q = q.in("type", ["create_fiction", "create_place", "add_photo"])
      }

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
        console.error("[contributions repo] listCreateContributionsStaffReviewFeedPage:", error.message)
        return { items: [], totalCount: 0 }
      }

      type Row = ContributionRow & { profiles: ProfileEmbed | ProfileEmbed[] | null }
      const fictionItems: FictionContributionFeedItem[] = []
      const placeItems: PlaceContributionFeedItem[] = []

      for (const row of (data ?? []) as Row[]) {
        if (row.entity_type === "place" && (row.type === "create_place" || row.type === "add_photo")) {
          const item = mapPlaceFeedItem(row, row.profiles)
          if (item) placeItems.push(item)
        } else if (row.entity_type === "fiction" && row.type === "create_fiction") {
          const item = mapFictionFeedItem(row, row.profiles)
          if (item) fictionItems.push(item)
        }
      }

      const [fictionTitles, fictionCovers, placeMeta, placeAvatars] = await Promise.all([
        fictionTitlesByIds(supabase, fictionItems.map((i) => i.entityId)),
        fictionCoverThumbByIds(supabase, fictionItems.map((i) => i.entityId)),
        placeMetaByIds(supabase, placeItems.map((i) => i.entityId)),
        placeAvatarThumbByIds(supabase, placeItems.map((i) => i.entityId)),
      ])

      const fictionIdsForPlaces = [...new Set(placeItems.map((i) => placeMeta.get(i.entityId)?.fictionId).filter(Boolean) as string[])]
      const parentFictionTitles = await fictionTitlesByIds(supabase, fictionIdsForPlaces)

      const enrichedFiction = fictionItems.map((i) => ({
        ...i,
        fictionTitle: fictionTitles.get(i.entityId) ?? null,
        fictionCoverUrl: fictionCovers.get(i.entityId) ?? null,
      }))

      const addPhotoIds = placeItems.filter((i) => i.type === "add_photo").map((i) => i.id)
      const pendingByContribution = await listPendingImagesForContributionIds(supabase, addPhotoIds)

      const enrichedPlace = placeItems.map((i) => {
        const meta = placeMeta.get(i.entityId)
        const fid = meta?.fictionId ?? null
        const pendingRows = pendingByContribution.get(i.id) ?? []
        return {
          ...i,
          placeName: meta?.name ?? null,
          placeAvatarUrl: placeAvatars.get(i.entityId) ?? null,
          fictionId: fid,
          fictionTitle: fid ? (parentFictionTitles.get(fid) ?? null) : null,
          pendingImages: pendingImagesToSnapshot(pendingRows),
        }
      })

      const itemById = new Map<string, StaffCreateContributionFeedItem>()
      for (const item of enrichedFiction) itemById.set(item.id, item)
      for (const item of enrichedPlace) itemById.set(item.id, item)

      const ordered: StaffCreateContributionFeedItem[] = []
      for (const row of (data ?? []) as Row[]) {
        const item = itemById.get(row.id)
        if (item) ordered.push(item)
      }

      return { items: ordered, totalCount: count ?? 0 }
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

    async insertPendingPlaceImages(input: InsertContributionPendingPlaceImagesInput): Promise<boolean> {
      const supabase = await getSupabase()
      const rows: Database["public"]["Tables"]["contribution_pending_images"]["Insert"][] = (
        ["sm", "lg"] as const
      ).map((variant) => ({
        contribution_id: input.contributionId,
        role: input.role,
        variant,
        storage_path: input.paths[variant],
      }))

      const { error } = await supabase.from("contribution_pending_images").insert(rows)
      if (error) {
        console.error("[contributions repo] insertPendingPlaceImages:", error.message)
        return false
      }
      return true
    },

    async listPendingImagesByContributionId(contributionId: string): Promise<ContributionPendingImage[]> {
      const supabase = await getSupabase()
      const { data, error } = await supabase
        .from("contribution_pending_images")
        .select("*")
        .eq("contribution_id", contributionId)

      if (error) {
        console.error("[contributions repo] listPendingImagesByContributionId:", error.message)
        return []
      }
      return (data as ContributionPendingImageRow[] | null)?.map(mapPendingImageRow) ?? []
    },

    async deletePendingImagesByContributionId(contributionId: string): Promise<string[]> {
      const supabase = await getSupabase()
      const { data, error: fetchErr } = await supabase
        .from("contribution_pending_images")
        .select("storage_path")
        .eq("contribution_id", contributionId)

      if (fetchErr) {
        console.error("[contributions repo] deletePendingImagesByContributionId fetch:", fetchErr.message)
        return []
      }

      const paths = (data ?? []).map((r) => r.storage_path).filter(Boolean)
      if (paths.length === 0) return []

      const { error } = await supabase
        .from("contribution_pending_images")
        .delete()
        .eq("contribution_id", contributionId)

      if (error) {
        console.error("[contributions repo] deletePendingImagesByContributionId:", error.message)
        return []
      }
      return paths
    },

    countPendingAddPhotoByPlace: cache(async (placeId: string): Promise<number> => {
      const supabase = await getSupabase()
      const { count, error } = await supabase
        .from("contributions")
        .select("*", { count: "exact", head: true })
        .eq("entity_type", "place")
        .eq("entity_id", placeId)
        .eq("type", "add_photo")
        .eq("status", "pending")

      if (error) {
        console.error("[contributions repo] countPendingAddPhotoByPlace:", error.message)
        return 0
      }
      return count ?? 0
    }),

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

    listCreateContributionsStaffReviewFeedPage(input) {
      const uid = input.userIdFilter?.trim()
      return listCreateContributionsStaffReviewFeedPageCached(
        input.kind,
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
        const base = mapFictionFeedItem(row, row.profiles)
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

    getPlaceCreateContributionWithContributorById: cache(
      async (id: string): Promise<PlaceContributionFeedItem | null> => {
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
          console.error("[contributions repo] getPlaceCreateContributionWithContributorById:", error.message)
          return null
        }
        if (!data) return null

        type Row = ContributionRow & { profiles: ProfileEmbed | ProfileEmbed[] | null }
        const row = data as Row
        if (row.entity_type !== "place") return null
        if (row.type !== "create_place" && row.type !== "add_photo") return null
        const base = mapPlaceFeedItem(row, row.profiles)
        if (!base) return null
        return enrichPlaceFeedItem(supabase, base)
      },
    ),

    getCreateContributionFeedItemById: cache(
      async (id: string): Promise<StaffCreateContributionFeedItem | null> => {
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
          console.error("[contributions repo] getCreateContributionFeedItemById:", error.message)
          return null
        }
        if (!data) return null

        type Row = ContributionRow & { profiles: ProfileEmbed | ProfileEmbed[] | null }
        const row = data as Row

        if (row.entity_type === "fiction" && row.type === "create_fiction") {
          const base = mapFictionFeedItem(row, row.profiles)
          if (!base) return null
          return enrichFictionFeedItem(supabase, base)
        }

        if (row.entity_type === "place" && (row.type === "create_place" || row.type === "add_photo")) {
          const base = mapPlaceFeedItem(row, row.profiles)
          if (!base) return null
          return enrichPlaceFeedItem(supabase, base)
        }

        return null
      },
    ),

    listTopContributors: cache(async (limit: number): Promise<TopContributorProfile[]> => {
      const supabase = await getSupabase()
      const safeLimit = Math.max(1, limit)
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url, fpp_total")
        .gt("fpp_total", 0)
        .order("fpp_total", { ascending: false })
        .limit(safeLimit)

      if (error) {
        console.error("[contributions repo] listTopContributors error:", error.message)
        return []
      }

      return (data ?? []).map((row) => ({
        id: row.id,
        username: row.username,
        fullName: row.full_name,
        avatarUrl: row.avatar_url,
        fppTotal: row.fpp_total ?? 0,
      }))
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

      if (contributionType === "add_photo" && entityType === "place") {
        const pendingMap = await listPendingImagesForContributionIds(supabase, [input.id])
        const snapshot = pendingImagesToSnapshot(pendingMap.get(input.id) ?? [])
        const smPath = snapshot?.paths.sm
        const lgPath = snapshot?.paths.lg
        const role = snapshot?.role
        if (!role || !smPath || !lgPath) {
          console.error("[contributions repo] approve add_photo missing pending assets")
          return false
        }
        const promoted = await promotePendingPlacePhotoToAssetImages(entityId, role, smPath, lgPath)
        if (!promoted.success) {
          console.error("[contributions repo] approve add_photo promote:", promoted.error)
          return false
        }
        const { error: pendingDelErr } = await supabase
          .from("contribution_pending_images")
          .delete()
          .eq("contribution_id", input.id)
        if (pendingDelErr) {
          console.error("[contributions repo] approve add_photo delete pending rows:", pendingDelErr.message)
          return false
        }
      }

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

      if (isCreateContributionType(contributionType)) {
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
        .select("*")
        .eq("id", input.id)
        .maybeSingle()

      if (fetchErr || !row) {
        console.error("[contributions repo] reject fetch:", fetchErr?.message)
        return false
      }

      const contribRow = row as ContributionRow
      if (contribRow.status !== "pending") return false

      const contributionType = contribRow.type as ContributionType
      const entityType = contribRow.entity_type as ContributionEntityType
      const entityId = contribRow.entity_id
      const now = new Date().toISOString()

      if (contributionType === "add_photo") {
        const { data: pendingRows, error: pendingFetchErr } = await supabase
          .from("contribution_pending_images")
          .select("storage_path")
          .eq("contribution_id", input.id)

        if (pendingFetchErr) {
          console.error("[contributions repo] reject add_photo fetch pending:", pendingFetchErr.message)
          return false
        }

        const paths = (pendingRows ?? []).map((r) => r.storage_path).filter(Boolean)
        await removePendingContributionStoragePaths(paths)

        const { error: pendingDelErr } = await supabase
          .from("contribution_pending_images")
          .delete()
          .eq("contribution_id", input.id)

        if (pendingDelErr) {
          console.error("[contributions repo] reject add_photo delete pending rows:", pendingDelErr.message)
          return false
        }
      }

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

      if (isCreateContributionType(contributionType)) {
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
      }

      return true
    },
  }
}

export const supabaseRepositoryAdapter = createContributionsSupabaseAdapter(createClient)
