import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/supabase/database.types"
import type { AssetImageRow } from "@/src/fictions/infrastructure/supabase/fiction.mappers"
import type { PlaceWishlistItem } from "@/src/place-wishlists/domain/place-wishlist.entity"
import type { PlaceWishlistsRepositoryPort } from "@/src/place-wishlists/domain/place-wishlist.repository"

type WishlistPlaceJoinRow = {
  place_id: string
  created_at: string
  places:
    | {
        name: string | null
        slug: string | null
        fiction_id: string | null
        fictions:
          | { id: string | null; title: string | null; slug: string | null }
          | { id: string | null; title: string | null; slug: string | null }[]
        locations:
          | {
              city_id: string | null
              latitude: number | null
              longitude: number | null
              formatted_address: string | null
            }
          | {
              city_id: string | null
              latitude: number | null
              longitude: number | null
              formatted_address: string | null
            }[]
      }
    | {
        name: string | null
        slug: string | null
        fiction_id: string | null
        fictions:
          | { id: string | null; title: string | null; slug: string | null }
          | { id: string | null; title: string | null; slug: string | null }[]
        locations:
          | {
              city_id: string | null
              latitude: number | null
              longitude: number | null
              formatted_address: string | null
            }
          | {
              city_id: string | null
              latitude: number | null
              longitude: number | null
              formatted_address: string | null
            }[]
      }[]
}

function firstOrSelf<T>(value: T | T[] | null | undefined): T | undefined {
  if (!value) return undefined
  return Array.isArray(value) ? value[0] : value
}

export function createPlaceWishlistsSupabaseAdapter(
  getSupabase: () => Promise<SupabaseClient<Database>>,
): PlaceWishlistsRepositoryPort {
  return {
    async listWishlistedPlaceIds(userId: string, placeIds: string[]): Promise<string[]> {
      if (placeIds.length === 0) return []
      const supabase = await getSupabase()
      const { data, error } = await supabase
        .from("place_wishlists")
        .select("place_id")
        .eq("user_id", userId)
        .in("place_id", placeIds)
      if (error) throw new Error(error.message)
      return (data ?? []).map((row) => row.place_id).filter(Boolean)
    },

    async isWishlisted(userId: string, placeId: string): Promise<boolean> {
      const supabase = await getSupabase()
      const { data, error } = await supabase
        .from("place_wishlists")
        .select("place_id")
        .eq("user_id", userId)
        .eq("place_id", placeId)
        .maybeSingle()
      if (error) throw new Error(error.message)
      return Boolean(data?.place_id)
    },

    async toggle(userId: string, placeId: string): Promise<boolean> {
      const supabase = await getSupabase()
      const { data: existing } = await supabase
        .from("place_wishlists")
        .select("place_id")
        .eq("user_id", userId)
        .eq("place_id", placeId)
        .maybeSingle()

      if (existing) {
        const { error } = await supabase
          .from("place_wishlists")
          .delete()
          .eq("user_id", userId)
          .eq("place_id", placeId)
        if (error) throw new Error(error.message)
        return false
      }

      const { error } = await supabase
        .from("place_wishlists")
        .insert({ user_id: userId, place_id: placeId })
      if (error) throw new Error(error.message)
      return true
    },

    async listItemsForUser(userId: string): Promise<PlaceWishlistItem[]> {
      const supabase = await getSupabase()
      const { data, error } = await supabase
        .from("place_wishlists")
        .select(
          `
          place_id,
          created_at,
          places!inner (
            name,
            slug,
            fiction_id,
            fictions!inner ( id, title, slug ),
            locations!inner ( city_id, latitude, longitude, formatted_address )
          )
        `,
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false })

      if (error) throw new Error(error.message)

      const rows = (data ?? []) as WishlistPlaceJoinRow[]
      const cityIds = [
        ...new Set(
          rows
            .map((row) => firstOrSelf(firstOrSelf(row.places)?.locations)?.city_id ?? undefined)
            .filter((id): id is string => !!id),
        ),
      ]
      const placeIds = [...new Set(rows.map((row) => row.place_id).filter(Boolean))]

      const [citiesRes, placeImagesRes] = await Promise.all([
        cityIds.length
          ? supabase.from("cities").select("id, name, slug, country, image_url").in("id", cityIds)
          : Promise.resolve({
              data: [] as {
                id: string
                name: string
                slug: string
                country: string | null
                image_url: string | null
              }[],
              error: null,
            }),
        placeIds.length
          ? supabase
              .from("asset_images")
              .select("entity_id, url")
              .eq("entity_type", "place")
              .eq("role", "avatar")
              .eq("variant", "sm")
              .in("entity_id", placeIds)
          : Promise.resolve({ data: [] as Pick<AssetImageRow, "entity_id" | "url">[], error: null }),
      ])

      const cityById = new Map(
        (citiesRes.data ?? []).map((c) => [
          c.id,
          { name: c.name, slug: c.slug, country: c.country, imageUrl: c.image_url },
        ]),
      )
      const placeImageById = new Map<string, string>()
      for (const row of placeImagesRes.data ?? []) {
        if (row.entity_id && row.url) placeImageById.set(row.entity_id, row.url)
      }

      return rows.map((row) => {
        const place = firstOrSelf(row.places)
        const fiction = firstOrSelf(place?.fictions)
        const location = firstOrSelf(place?.locations)
        const cityId = location?.city_id ?? null
        const city = cityId ? cityById.get(cityId) : undefined
        return {
          placeId: row.place_id,
          placeSlug: place?.slug ?? row.place_id,
          placeName: place?.name?.trim() || "Unknown place",
          placeImage: placeImageById.get(row.place_id) ?? null,
          fictionId: place?.fiction_id ?? "",
          fictionSlug: fiction?.slug ?? "",
          fictionTitle: fiction?.title ?? "",
          lat: Number.isFinite(Number(location?.latitude)) ? Number(location?.latitude) : null,
          lng: Number.isFinite(Number(location?.longitude)) ? Number(location?.longitude) : null,
          address: location?.formatted_address?.trim() || null,
          cityId,
          cityName: city?.name ?? null,
          citySlug: city?.slug ?? null,
          cityImage: city?.imageUrl ?? null,
          cityCountry: city?.country ?? null,
          createdAt: row.created_at,
        }
      })
    },
  }
}
