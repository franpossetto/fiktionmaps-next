import type { SuggestedPlace } from "@/src/places/domain/suggested-place.entity"

export type TogglePlaceWishlistActionResult =
  | { success: true; wishlisted: boolean }
  | { success: false; error: string }

export type ListSuggestedPlacesForWishlistActionResult =
  | { success: true; items: SuggestedPlace[] }
  | { success: false; error: string }
