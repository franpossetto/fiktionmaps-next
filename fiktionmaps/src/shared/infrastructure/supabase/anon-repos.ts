import { createAnonymousClient } from "@/lib/supabase/server"
import { createCitiesSupabaseAdapter } from "@/src/cities/infrastructure/supabase/city.repository.impl"
import { createFictionsSupabaseAdapter } from "@/src/fictions/infrastructure/supabase/fiction.repository.impl"
import { createPlacesSupabaseAdapter } from "@/src/places/infrastructure/supabase/place.repository.impl"

const anon = () => Promise.resolve(createAnonymousClient())

/** Read-only repos using the anonymous client — safe inside `unstable_cache`. */
export const citiesRepoPublic = createCitiesSupabaseAdapter(anon)
export const placesRepoPublic = createPlacesSupabaseAdapter(anon)
export const fictionsRepoPublic = createFictionsSupabaseAdapter(anon)
