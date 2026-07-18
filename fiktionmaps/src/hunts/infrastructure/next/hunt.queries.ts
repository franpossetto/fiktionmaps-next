import { cache } from "react"
import { createClient } from "@/lib/supabase/server"
import { huntSourcesSupabaseAdapter } from "@/src/hunts/infrastructure/supabase/hunt-source.repository.impl"
import { huntsSupabaseAdapter } from "@/src/hunts/infrastructure/supabase/hunt.repository.impl"
import { listHuntSourcesUseCase } from "@/src/hunts/application/list-hunt-sources.usecase"
import { getHuntByIdUseCase, listHuntsBySourceIdUseCase } from "@/src/hunts/application/get-hunt.usecase"
import { listMyHuntsWorkQueueUseCase } from "@/src/hunts/application/list-my-hunts-work-queue.usecase"
import { createFictionsSupabaseAdapter } from "@/src/fictions/infrastructure/supabase/fiction.repository.impl"
import { getAllCitiesCached } from "@/src/cities/infrastructure/next/city.queries"
import type { HuntSource } from "@/src/hunts/domain/hunt-source.entity"
import type { Hunt } from "@/src/hunts/domain/hunt.entity"
import type { HuntWorkQueueItem } from "@/src/hunts/domain/hunt-work-queue.types"
import { getHuntPlaceContributePrefillUseCase } from "@/src/hunts/application/get-hunt-place-contribute-prefill.usecase"
import type { HuntPlaceContributePrefill } from "@/src/hunts/domain/hunt-candidate.helpers"

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

export const getMyHuntsWorkQueueCached = cache(async (): Promise<HuntWorkQueueItem[]> => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const fictionsRepo = createFictionsSupabaseAdapter(createClient)
  return listMyHuntsWorkQueueUseCase(
    user.id,
    huntsSupabaseAdapter,
    huntSourcesSupabaseAdapter,
    fictionsRepo,
  )
})

export const getHuntPlaceContributePrefillCached = cache(
  async (huntId: string, placeIndex: number): Promise<HuntPlaceContributePrefill | null> => {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return null

    try {
      const cities = await getAllCitiesCached()
      return await getHuntPlaceContributePrefillUseCase(
        huntId,
        placeIndex,
        user.id,
        huntsSupabaseAdapter,
        huntSourcesSupabaseAdapter,
        cities,
      )
    } catch {
      return null
    }
  },
)
