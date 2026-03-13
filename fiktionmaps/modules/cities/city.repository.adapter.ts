import { createClient } from "@/lib/supabase/server"
import type { City } from "./city.domain"
import type { UpdateCityData } from "./city.dtos"
import type { CitiesRepositoryPort } from "./city.repository.port"

export const supabaseRepositoryAdapter: CitiesRepositoryPort = {
  async getAll(): Promise<City[]> {
    const supabase = await createClient()
    const { data, error } = await supabase.from("cities").select("*").order("name")
    if (error) return []
    return (data ?? []) as City[]
  },

  async getById(id: string): Promise<City | null> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("cities")
      .select("*")
      .eq("id", id)
      .single()
    if (error || !data) return null
    return data as City
  },

  async update(id: string, updates: UpdateCityData): Promise<City | null> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("cities")
      .update(updates)
      .eq("id", id)
      .select()
      .single()
    if (error || !data) return null
    return data as City
  },
}
