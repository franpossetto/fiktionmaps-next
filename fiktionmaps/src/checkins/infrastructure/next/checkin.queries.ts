import { getSessionUserId } from "@/lib/auth/auth.service"
import { checkinsSupabaseAdapter } from "@/src/checkins/infrastructure/supabase/checkin.repository.impl"
import { loadEnrichedPlaceCheckinsUseCase } from "@/src/checkins/application/load-enriched-place-checkins.usecase"
import type { EnrichedPlaceCheckin } from "@/src/checkins/domain/checkin.entity"

/** Profile sidebar: place check-ins with joined labels and images. Not cached — user-specific. */
export async function loadEnrichedPlaceCheckinsForCurrentUser(): Promise<EnrichedPlaceCheckin[]> {
  const userId = await getSessionUserId()
  if (!userId) return []
  return loadEnrichedPlaceCheckinsUseCase(userId, checkinsSupabaseAdapter)
}
