import { cache } from "react"
import { createClient } from "@/lib/supabase/server"
import { huntSourcesSupabaseAdapter } from "@/src/hunts/infrastructure/supabase/hunt-source.repository.impl"
import { huntsSupabaseAdapter } from "@/src/hunts/infrastructure/supabase/hunt.repository.impl"
import { listHuntSourcesUseCase } from "@/src/hunts/application/list-hunt-sources.usecase"
import { getHuntByIdUseCase, listHuntsBySourceIdUseCase } from "@/src/hunts/application/get-hunt.usecase"
import type { HuntSource } from "@/src/hunts/domain/hunt-source.entity"
import type { Hunt } from "@/src/hunts/domain/hunt.entity"

export const getMyHuntSourcesCached = cache(async (): Promise<HuntSource[]> => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  return listHuntSourcesUseCase(user.id, huntSourcesSupabaseAdapter)
})

export const getHuntByIdCached = cache(async (huntId: string): Promise<Hunt | null> => {
  return getHuntByIdUseCase(huntId, huntsSupabaseAdapter)
})

export const getHuntsBySourceIdCached = cache(async (sourceId: string): Promise<Hunt[]> => {
  return listHuntsBySourceIdUseCase(sourceId, huntsSupabaseAdapter)
})
