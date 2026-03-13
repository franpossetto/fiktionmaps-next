import { createClient } from "@/lib/supabase/server"
import type { Fiction } from "./fiction.domain"
import type { UpdateFictionData } from "./fiction.dtos"
import type { FictionsRepositoryPort } from "./fiction.repository.port"

export const supabaseRepositoryAdapter: FictionsRepositoryPort = {
  async getAll(): Promise<Fiction[]> {
    const supabase = await createClient()
    const { data, error } = await supabase.from("fictions").select("*").order("title")
    if (error) return []
    return (data ?? []) as Fiction[]
  },

  async getById(id: string): Promise<Fiction | null> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("fictions")
      .select("*")
      .eq("id", id)
      .single()
    if (error || !data) return null
    return data as Fiction
  },

  async update(
    id: string,
    updates: UpdateFictionData
  ): Promise<Fiction | null> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("fictions")
      .update(updates)
      .eq("id", id)
      .select()
      .single()
    if (error || !data) return null
    return data as Fiction
  },
}
