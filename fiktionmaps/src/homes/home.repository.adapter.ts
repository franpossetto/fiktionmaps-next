import { createClient } from "@/lib/supabase/server"
import type { UserHome } from "./home.domain"
import type { CreateHomeData, UpdateHomeData } from "./home.dtos"
import type { HomesRepositoryPort } from "./home.repository.port"

function toUserHome(row: {
  id: string
  user_id: string
  city_id: string
  date_from: string
  date_to: string | null
  created_at: string
}): UserHome {
  return {
    id: row.id,
    userId: row.user_id,
    cityId: row.city_id,
    dateFrom: row.date_from,
    dateTo: row.date_to,
    createdAt: row.created_at,
  }
}

export const homesSupabaseAdapter: HomesRepositoryPort = {
  async getByUserId(userId: string): Promise<UserHome[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("user_homes")
      .select("*")
      .eq("user_id", userId)
      .order("date_from", { ascending: false })
    if (error || !data) return []
    return data.map(toUserHome)
  },

  async create(userId: string, dto: CreateHomeData): Promise<UserHome | null> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("user_homes")
      .insert({
        user_id: userId,
        city_id: dto.cityId,
        date_from: dto.dateFrom,
        date_to: dto.dateTo ?? null,
      })
      .select()
      .single()
    if (error || !data) return null
    return toUserHome(data)
  },

  async update(id: string, dto: UpdateHomeData): Promise<UserHome | null> {
    const supabase = await createClient()
    const updates: Record<string, unknown> = {}
    if (dto.dateFrom !== undefined) updates.date_from = dto.dateFrom
    if (dto.dateTo !== undefined) updates.date_to = dto.dateTo
    const { data, error } = await supabase
      .from("user_homes")
      .update(updates)
      .eq("id", id)
      .select()
      .single()
    if (error || !data) return null
    return toUserHome(data)
  },

  async delete(id: string): Promise<boolean> {
    const supabase = await createClient()
    const { error } = await supabase
      .from("user_homes")
      .delete()
      .eq("id", id)
    return !error
  },

  async closeCurrentHome(userId: string): Promise<void> {
    const supabase = await createClient()
    const today = new Date().toISOString().slice(0, 10)
    await supabase
      .from("user_homes")
      .update({ date_to: today })
      .eq("user_id", userId)
      .is("date_to", null)
  },
}
