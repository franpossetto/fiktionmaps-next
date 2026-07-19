import { cache } from "react"
import type { SupabaseClient } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/server"
import type { Database } from "@/supabase/database.types"
import type { City } from "@/src/cities/domain/city.entity"
import type {
  CitiesRepositoryPort,
  CreateCityRepoInput,
  UpdateCityRepoInput,
} from "@/src/cities/domain/city.repository"

type CityRow = Database["public"]["Tables"]["cities"]["Row"]

function mapCity(row: CityRow): City {
  return {
    id: row.id,
    name: row.name,
    country: row.country,
    slug: row.slug,
    lat: row.lat,
    lng: row.lng,
    zoom: row.zoom,
    image_url: row.image_url,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

function isUniqueViolation(error: { code?: string } | null): boolean {
  return error?.code === "23505"
}

export function createCitiesSupabaseAdapter(
  getSupabase: () => Promise<SupabaseClient<Database>>
): CitiesRepositoryPort {
  return {
    getAll: cache(async (): Promise<City[]> => {
      const supabase = await getSupabase()
      const { data, error } = await supabase.from("cities").select("*").order("name")
      if (error) return []
      return (data ?? []).map(mapCity)
    }),

    getById: cache(async (id: string): Promise<City | null> => {
      const supabase = await getSupabase()
      const { data, error } = await supabase
        .from("cities")
        .select("*")
        .eq("id", id)
        .single()
      if (error || !data) return null
      return mapCity(data)
    }),

    getBySlug: cache(async (slug: string): Promise<City | null> => {
      const supabase = await getSupabase()
      const { data, error } = await supabase
        .from("cities")
        .select("*")
        .eq("slug", slug)
        .maybeSingle()
      if (error || !data) return null
      return mapCity(data)
    }),

    findByNameAndCountry: cache(async (name: string, country: string): Promise<City | null> => {
      const supabase = await getSupabase()
      const { data, error } = await supabase
        .from("cities")
        .select("*")
        .ilike("name", name)
        .ilike("country", country)
        .limit(1)
        .maybeSingle()
      if (error || !data) return null
      return mapCity(data)
    }),

    // Not wrapped in React cache — used on write paths that must see fresh UNIQUE state.
    async findSlugsByPrefix(prefix: string, excludeId?: string): Promise<string[]> {
      const supabase = await getSupabase()
      let query = supabase.from("cities").select("slug").like("slug", `${prefix}%`)
      if (excludeId) query = query.neq("id", excludeId)
      const { data, error } = await query
      if (error) return []
      return (data ?? []).map((r) => r.slug).filter(Boolean)
    },

    hasPublicPlaces: cache(async (cityId: string): Promise<boolean> => {
      const supabase = await getSupabase()
      const { data, error } = await supabase
        .from("places")
        .select("id, locations!inner(city_id)")
        .eq("locations.city_id", cityId)
        .eq("active", true)
        .eq("status", "approved")
        .limit(1)
        .maybeSingle()
      if (error) {
        console.error("[cities repo] hasPublicPlaces:", error.message)
        return false
      }
      return Boolean(data)
    }),

    listWithPublicPlaces: cache(async (): Promise<City[]> => {
      const supabase = await getSupabase()
      const cityIds = new Set<string>()
      const pageSize = 1000

      for (let from = 0; ; from += pageSize) {
        const { data, error } = await supabase
          .from("places")
          .select("locations!inner(city_id)")
          .eq("active", true)
          .eq("status", "approved")
          .order("id", { ascending: true })
          .range(from, from + pageSize - 1)

        if (error) {
          console.error("[cities repo] listWithPublicPlaces places:", error.message)
          break
        }
        if (!data?.length) break

        for (const row of data as Record<string, unknown>[]) {
          const rawLoc = row.locations
          const loc = Array.isArray(rawLoc) ? rawLoc[0] : rawLoc
          if (loc && typeof loc === "object" && loc !== null && "city_id" in loc) {
            const cid = (loc as { city_id?: string }).city_id
            if (typeof cid === "string" && cid) cityIds.add(cid)
          }
        }

        if (data.length < pageSize) break
      }

      if (cityIds.size === 0) return []

      const { data: cities, error: citiesError } = await supabase
        .from("cities")
        .select("*")
        .in("id", [...cityIds])
        .order("name")

      if (citiesError || !cities) return []
      return cities.map(mapCity)
    }),

    async create(data: CreateCityRepoInput): Promise<City | null> {
      const supabase = await getSupabase()
      const { data: row, error } = await supabase
        .from("cities")
        .insert({
          name: data.name,
          country: data.country,
          slug: data.slug,
          lat: data.lat,
          lng: data.lng,
          zoom: data.zoom,
          image_url: data.image_url ?? null,
        })
        .select()
        .single()
      if (error || !row) {
        if (isUniqueViolation(error)) return null
        return null
      }
      return mapCity(row)
    },

    async update(id: string, updates: UpdateCityRepoInput): Promise<City | null> {
      const supabase = await getSupabase()
      const payload: Database["public"]["Tables"]["cities"]["Update"] = {}
      if (updates.name !== undefined) payload.name = updates.name
      if (updates.country !== undefined) payload.country = updates.country
      if (updates.slug !== undefined) payload.slug = updates.slug
      if (updates.lat !== undefined) payload.lat = updates.lat
      if (updates.lng !== undefined) payload.lng = updates.lng
      if (updates.zoom !== undefined) payload.zoom = updates.zoom
      if (updates.image_url !== undefined) payload.image_url = updates.image_url

      const { data, error } = await supabase
        .from("cities")
        .update(payload)
        .eq("id", id)
        .select()
        .single()
      if (error || !data) return null
      return mapCity(data)
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
