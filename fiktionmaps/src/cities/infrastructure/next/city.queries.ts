import { unstable_cache } from "next/cache"
import { createAnonymousClient } from "@/lib/supabase/server"
import { createCitiesSupabaseAdapter } from "@/src/cities/infrastructure/supabase/city.repository.impl"
import { createFictionsSupabaseAdapter } from "@/src/fictions/infrastructure/supabase/fiction.repository.impl"
import { createPlacesSupabaseAdapter } from "@/src/places/infrastructure/supabase/place.repository.impl"
import { getAllCitiesUseCase } from "@/src/cities/application/get-all-cities.usecase"
import { getCityByIdUseCase } from "@/src/cities/application/get-city-by-id.usecase"
import { getCityFictionsUseCase } from "@/src/cities/application/get-city-fictions.usecase"
import { CacheKeys } from "@/src/shared/infrastructure/next/cache.keys"
import { CacheConfig } from "@/src/shared/infrastructure/next/cache.config"

const anon = () => Promise.resolve(createAnonymousClient())
const citiesRepo = createCitiesSupabaseAdapter(anon)
const fictionsRepo = createFictionsSupabaseAdapter(anon)
const placesRepo = createPlacesSupabaseAdapter(anon)

export function getAllCitiesCached() {
  return unstable_cache(
    () => getAllCitiesUseCase(citiesRepo),
    CacheKeys.city("all"),
    { ...CacheConfig.long, tags: ["cities"] }
  )()
}

export function getCityByIdCached(id: string) {
  return unstable_cache(
    () => getCityByIdUseCase(id, citiesRepo),
    CacheKeys.city(id),
    { ...CacheConfig.long, tags: ["cities", `city-${id}`] }
  )()
}

export function getCityFictionsCached(cityId: string) {
  return unstable_cache(
    () => getCityFictionsUseCase(cityId, { placesRepo, fictionsRepo }),
    CacheKeys.city(`fictions:${cityId}`),
    { ...CacheConfig.long, tags: ["cities", "fictions"] }
  )()
}
