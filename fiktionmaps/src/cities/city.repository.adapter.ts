import type { SupabaseClient } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/server"
import type { Database } from "@/supabase/database.types"
import type { City } from "./city.domain"
import type { CreateCityData, UpdateCityData } from "./city.dtos"
import type { CitiesRepositoryPort } from "./city.repository.port"

export function createCitiesSupabaseAdapter(
  getSupabase: () => Promise<SupabaseClient<Database>>
): CitiesRepositoryPort {
  return {
    async getAll(): Promise<City[]> {
      const supabase = await getSupabase()
      const { data, error } = await supabase.from("cities").select("*").order("name")
      if (error) return []
      return (data ?? []) as City[]
    },

    async getById(id: string): Promise<City | null> {
      const supabase = await getSupabase()
      const { data, error } = await supabase
        .from("cities")
        .select("*")
        .eq("id", id)
        .single()
      if (error || !data) return null
      return data as City
    },

    async findByNameAndCountry(name: string, country: string): Promise<City | null> {
      const supabase = await getSupabase()
      const { data, error } = await supabase
        .from("cities")
        .select("*")
        .ilike("name", name)
        .ilike("country", country)
        .limit(1)
        .maybeSingle()
      if (error || !data) return null
      return data as City
    },

    async create(data: CreateCityData): Promise<City | null> {
      const supabase = await getSupabase()
      const { data: row, error } = await supabase
        .from("cities")
        .insert({
          name: data.name,
          country: data.country,
          lat: data.lat,
          lng: data.lng,
          zoom: data.zoom,
        })
        .select()
        .single()
      if (error || !row) return null
      return row as City
    },

    async update(id: string, updates: UpdateCityData): Promise<City | null> {
      const supabase = await getSupabase()
      const { data, error } = await supabase
        .from("cities")
        .update(updates)
        .eq("id", id)
        .select()
        .single()
      if (error || !data) return null
      return data as City
    },

    async delete(id: string): Promise<boolean> {
      const supabase = await getSupabase()
      const { data, error } = await supabase
        .from("cities")
        .delete()
        .eq("id", id)
        .select("id")
      if (error) return false
      return Array.isArray(data) && data.length === 1
    },
  }
}

export const supabaseRepositoryAdapter = createCitiesSupabaseAdapter(createClient)
