import { unstable_cache } from "next/cache"
import { getAllCitiesUncached, getCityFictionsUncached } from "@/lib/server/cities"

/** Cached 60s; invalidate with revalidateTag("cities"). */
export const getAllCities = unstable_cache(
  async () => getAllCitiesUncached(),
  ["cities"],
  { revalidate: 60, tags: ["cities"] }
)

/** Fictions linked to a city; cached with anonymous-backed data inside the cache scope. */
export function getCityFictions(cityId: string) {
  return unstable_cache(
    async () => getCityFictionsUncached(cityId),
    ["city-fictions", cityId],
    { revalidate: 60, tags: ["cities", "fictions"] }
  )()
}
