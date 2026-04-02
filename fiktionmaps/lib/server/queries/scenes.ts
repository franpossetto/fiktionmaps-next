import { unstable_cache } from "next/cache"
import {
  getCityFictionsWithScenesUncached,
  listCitiesWithActiveScenes,
} from "@/lib/server/scenes"

/** Cities that have at least one active scene with video (viewer-aligned). */
export const getCitiesWithScenesForViewer = unstable_cache(
  async () => listCitiesWithActiveScenes(null),
  ["cities-with-scenes-viewer"],
  { revalidate: 60, tags: ["cities", "fictions", "scenes"] },
)

export function getCityFictionsWithScenesForViewer(cityId: string) {
  return unstable_cache(
    async () => getCityFictionsWithScenesUncached(cityId),
    ["city-fictions-with-scenes", cityId],
    { revalidate: 60, tags: ["cities", "fictions", "scenes"] },
  )()
}
