"use server"

import { revalidatePath } from "next/cache"
import { createAnonymousClient, createClient } from "@/lib/supabase/server"
import { uuidSchema } from "@/lib/validation/primitives"
import { listSuggestedPlacesForWishlistUseCase } from "@/src/places/application/list-suggested-places-for-wishlist.usecase"
import { createPlacesSupabaseAdapter } from "@/src/places/infrastructure/supabase/place.repository.impl"
import { togglePlaceWishlistUseCase } from "@/src/place-wishlists/application/toggle-place-wishlist.usecase"
import { createPlaceWishlistsSupabaseAdapter } from "@/src/place-wishlists/infrastructure/supabase/place-wishlist.repository.impl"
import type {
  ListSuggestedPlacesForWishlistActionResult,
  TogglePlaceWishlistActionResult,
} from "./place-wishlist.actions.types"

export type {
  ListSuggestedPlacesForWishlistActionResult,
  TogglePlaceWishlistActionResult,
} from "./place-wishlist.actions.types"

const suggestedPlacesRepo = createPlacesSupabaseAdapter(async () => createAnonymousClient())

export async function listSuggestedPlacesForWishlistAction(): Promise<ListSuggestedPlacesForWishlistActionResult> {
  try {
    const items = await listSuggestedPlacesForWishlistUseCase(suggestedPlacesRepo, 8)
    return { success: true, items }
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to load suggestions",
    }
  }
}

export async function togglePlaceWishlistAction(
  placeId: string,
): Promise<TogglePlaceWishlistActionResult> {
  const parsed = uuidSchema.safeParse(placeId)
  if (!parsed.success) return { success: false, error: "Invalid placeId" }

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return { success: false, error: "Unauthorized" }

  try {
    const result = await togglePlaceWishlistUseCase(
      user.id,
      parsed.data,
      createPlaceWishlistsSupabaseAdapter(createClient),
      createPlacesSupabaseAdapter(createClient),
    )
    if (!result.success) return result
    revalidatePath("/profile")
    return result
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to update wishlist" }
  }
}
