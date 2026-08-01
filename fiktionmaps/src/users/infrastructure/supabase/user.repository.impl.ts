import { cache } from "react"
import type { SupabaseClient } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/server"
import type { Database, Tables } from "@/supabase/database.types"
import type { Profile } from "@/src/users/domain/user.entity"
import type { UsersRepositoryPort } from "@/src/users/domain/user.repository"
import type { UpdateProfileData } from "@/src/users/domain/user.dtos"
import type { ProfilesPage } from "@/src/users/domain/user.views"
import { parseProfileRole, type UserRole } from "@/src/users/domain/user.dtos"
import { normalizeImageFocus } from "@/lib/asset-images/image-focus"

function mapProfileRow(
  row: Tables<"profiles">,
  focus?: { focus_x: number | null; focus_y: number | null } | null
): Profile {
  const role: UserRole = parseProfileRole(row.role)
  const hasFocus = focus && (focus.focus_x != null || focus.focus_y != null)
  const normalized = hasFocus
    ? normalizeImageFocus(focus.focus_x, focus.focus_y)
    : null
  return {
    id: row.id,
    username: row.username,
    full_name: row.full_name,
    avatar_url: row.avatar_url,
    avatar_focus_x: normalized?.x ?? null,
    avatar_focus_y: normalized?.y ?? null,
    bio: row.bio,
    gender: row.gender,
    phone: row.phone,
    date_of_birth: row.date_of_birth,
    onboarding_completed: row.onboarding_completed,
    role,
    fpp_total: row.fpp_total ?? 0,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

async function fetchProfileAvatarFocus(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<{ focus_x: number | null; focus_y: number | null } | null> {
  const { data, error } = await supabase
    .from("asset_images")
    .select("focus_x, focus_y")
    .eq("entity_type", "profile")
    .eq("entity_id", userId)
    .eq("role", "avatar")
    .limit(1)
    .maybeSingle()

  if (error || !data) return null
  return data
}

export function createUsersSupabaseAdapter(
  getSupabase: () => Promise<SupabaseClient<Database>>
): UsersRepositoryPort {
  return {
    getProfile: cache(async (userId: string): Promise<Profile | null> => {
      const supabase = await getSupabase()
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single()

      if (error || !data) return null
      const focus = await fetchProfileAvatarFocus(supabase, userId)
      return mapProfileRow(data, focus)
    }),

    getProfileByUsername: cache(async (username: string): Promise<Profile | null> => {
      const supabase = await getSupabase()
      const trimmed = username.trim()
      if (!trimmed) return null

      // Unique index is LOWER(TRIM(username)); escape ILIKE wildcards for exact match.
      const escaped = trimmed.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_")
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .ilike("username", escaped)
        .maybeSingle()

      if (error || !data) return null
      const focus = await fetchProfileAvatarFocus(supabase, data.id)
      return mapProfileRow(data, focus)
    }),

    async updateProfile(
      userId: string,
      updates: UpdateProfileData
    ): Promise<Profile | null> {
      const supabase = await getSupabase()
      const { data, error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", userId)
        .select()
        .single()

      if (error || !data) return null
      const focus = await fetchProfileAvatarFocus(supabase, userId)
      return mapProfileRow(data, focus)
    },

    listProfilesPage: cache(async (page: number, pageSize: number): Promise<ProfilesPage> => {
      const supabase = await getSupabase()
      const safePage = Math.max(1, page)
      const safeSize = Math.max(1, pageSize)
      const from = (safePage - 1) * safeSize
      const to = from + safeSize - 1

      const { data, error, count } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url, fpp_total", { count: "exact" })
        .order("fpp_total", { ascending: false })
        .order("username", { ascending: true, nullsFirst: false })
        .range(from, to)

      if (error || !data) return { profiles: [], totalCount: 0 }

      return {
        profiles: data.map((row) => ({
          id: row.id,
          username: row.username,
          fullName: row.full_name,
          avatarUrl: row.avatar_url,
          fppTotal: row.fpp_total ?? 0,
        })),
        totalCount: count ?? 0,
      }
    }),
  }
}

export const usersSupabaseAdapter = createUsersSupabaseAdapter(createClient)
