import { createAnonymousClient } from "@/lib/supabase/server"
import { createCitiesSupabaseAdapter } from "@/src/cities/city.repository.adapter"
import { createFictionsSupabaseAdapter } from "@/src/fictions/fiction.repository.adapter"
import { createPlacesSupabaseAdapter } from "@/src/places"

const anon = () => Promise.resolve(createAnonymousClient())

/** Read-only repos using the anonymous client — safe inside `unstable_cache`. */
export const citiesRepoPublic = createCitiesSupabaseAdapter(anon)
export const placesRepoPublic = createPlacesSupabaseAdapter(anon)
export const fictionsRepoPublic = createFictionsSupabaseAdapter(anon)
