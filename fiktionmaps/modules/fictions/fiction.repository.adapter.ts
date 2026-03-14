import { createClient } from "@/lib/supabase/server"
import type { Fiction } from "./fiction.domain"
import type { CreateFictionData, UpdateFictionData } from "./fiction.dtos"
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

  async create(data: CreateFictionData): Promise<Fiction | null> {
    const supabase = await createClient()
    const { data: row, error } = await supabase
      .from("fictions")
      .insert({
        title: data.title,
        type: data.type,
        year: data.year,
        author: data.author ?? null,
        genre: data.genre,
        description: data.description,
        active: data.active ?? true,
      })
      .select()
      .single()
    if (error || !row) return null
    return row as Fiction
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

  async delete(id: string): Promise<boolean> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("fictions")
      .delete()
      .eq("id", id)
      .select("id")
    if (error) return false
    // RLS or missing row can yield 0 rows deleted; success only if one row was deleted
    return Array.isArray(data) && data.length === 1
  },
}
