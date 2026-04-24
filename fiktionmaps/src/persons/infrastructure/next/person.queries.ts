import { createClient } from "@/lib/supabase/server"
import { createPersonsSupabaseAdapter } from "@/src/persons/infrastructure/supabase/person.repository.impl"

export async function getAllPersonsCached() {
  const repo = createPersonsSupabaseAdapter(createClient)
  return repo.getAll()
}
