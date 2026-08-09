import { unstable_cache } from "next/cache"
import { createAnonymousClient, createClient } from "@/lib/supabase/server"
import { createPersonsSupabaseAdapter } from "@/src/persons/infrastructure/supabase/person.repository.impl"
import { getFictionPersons } from "@/src/persons/application/get-fiction-persons.usecase"
import type { FictionPerson, Person } from "@/src/persons/domain/person.entity"
import { CacheKeys } from "@/src/shared/infrastructure/next/cache.keys"
import { CacheConfig } from "@/src/shared/infrastructure/next/cache.config"

const anon = () => Promise.resolve(createAnonymousClient())
const anonPersonsRepo = createPersonsSupabaseAdapter(anon)

/** @deprecated Prefer a dedicated use case when this path is next touched. */
export async function getAllPersonsCached(): Promise<Person[]> {
  const repo = createPersonsSupabaseAdapter(createClient)
  return repo.getAll()
}

export function getFictionPersonsCached(fictionId: string): Promise<FictionPerson[]> {
  return unstable_cache(
    () => getFictionPersons({ fictionId }, anonPersonsRepo),
    CacheKeys.fictionPersons(fictionId),
    { ...CacheConfig.medium, tags: ["persons", `fiction-${fictionId}`] },
  )()
}
