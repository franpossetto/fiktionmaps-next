import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/supabase/database.types"
import { createClient } from "@/lib/supabase/server"
import type { PersonsRepositoryPort } from "@/src/persons/domain/person.repository"
import type { Person, FictionPerson } from "@/src/persons/domain/person.entity"
import type { CreatePersonData, FictionPersonEntry } from "@/src/persons/domain/person.schemas"

export function createPersonsSupabaseAdapter(
  getSupabase: () => Promise<SupabaseClient<Database>>
): PersonsRepositoryPort {
  return {
    async getAll(): Promise<Person[]> {
      const supabase = await getSupabase()
      const { data, error } = await supabase
        .from("persons")
        .select("*")
        .order("name")
      if (error) throw new Error(error.message)
      return (data ?? []) as Person[]
    },

    async search(query: string): Promise<Person[]> {
      const supabase = await getSupabase()
      const { data, error } = await supabase
        .from("persons")
        .select("*")
        .ilike("name", `%${query}%`)
        .order("name")
        .limit(20)
      if (error) throw new Error(error.message)
      return (data ?? []) as Person[]
    },

    async getById(id: string): Promise<Person | null> {
      const supabase = await getSupabase()
      const { data, error } = await supabase
        .from("persons")
        .select("*")
        .eq("id", id)
        .single()
      if (error || !data) return null
      return data as Person
    },

    async create(data: CreatePersonData): Promise<Person | null> {
      const supabase = await getSupabase()
      const { data: row, error } = await supabase
        .from("persons")
        .insert({
          name: data.name,
          bio: data.bio ?? null,
          photo_url: data.photo_url ?? null,
          birth_year: data.birth_year ?? null,
          nationality: data.nationality ?? null,
        })
        .select()
        .single()
      if (error || !row) return null
      return row as Person
    },

    async delete(id: string): Promise<boolean> {
      const supabase = await getSupabase()
      const { data, error } = await supabase
        .from("persons")
        .delete()
        .eq("id", id)
        .select("id")
      if (error) return false
      return Array.isArray(data) && data.length === 1
    },

    async getByFictionId(fictionId: string): Promise<FictionPerson[]> {
      const supabase = await getSupabase()
      const { data, error } = await supabase
        .from("fiction_persons")
        .select("id, person_id, role, sort_order, persons(name)")
        .eq("fiction_id", fictionId)
        .order("sort_order")
      if (error) throw new Error(error.message)
      return (data ?? []).map((row) => ({
        id: row.id,
        person_id: row.person_id,
        name: (row.persons as { name: string } | null)?.name ?? "",
        role: row.role,
        sort_order: row.sort_order,
      }))
    },

    async setForFiction(fictionId: string, entries: FictionPersonEntry[]): Promise<void> {
      const supabase = await getSupabase()
      const dedupedByKey = new Map<
        string,
        { fiction_id: string; person_id: string; role: string; sort_order: number }
      >()

      entries.forEach((entry, index) => {
        const key = `${entry.person_id}::${entry.role}`
        dedupedByKey.set(key, {
          fiction_id: fictionId,
          person_id: entry.person_id,
          role: entry.role,
          sort_order: entry.sort_order ?? index,
        })
      })

      const dedupedEntries = Array.from(dedupedByKey.values())

      if (dedupedEntries.length > 0) {
        const { error: upsertError } = await supabase
          .from("fiction_persons")
          .upsert(dedupedEntries, { onConflict: "fiction_id,person_id,role" })
        if (upsertError) throw new Error(upsertError.message)
      }

      const { data: existingRows, error: existingRowsError } = await supabase
        .from("fiction_persons")
        .select("id, person_id, role")
        .eq("fiction_id", fictionId)
      if (existingRowsError) throw new Error(existingRowsError.message)

      const validKeys = new Set(dedupedByKey.keys())
      const idsToDelete = (existingRows ?? [])
        .filter((row) => !validKeys.has(`${row.person_id}::${row.role}`))
        .map((row) => row.id)

      if (idsToDelete.length > 0) {
        const { error: pruneError } = await supabase
          .from("fiction_persons")
          .delete()
          .in("id", idsToDelete)
        if (pruneError) throw new Error(pruneError.message)
      }
    },
  }
}

export const supabaseRepositoryAdapter = createPersonsSupabaseAdapter(createClient)
