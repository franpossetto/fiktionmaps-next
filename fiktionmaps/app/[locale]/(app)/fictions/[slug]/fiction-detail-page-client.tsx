"use client"

import { useRouter } from "@/i18n/navigation"
import { FictionDetail } from "@/components/fictions/fiction-detail"
import type { FictionWithMedia } from "@/src/fictions/domain/fiction.entity"
import type { Location } from "@/src/locations/domain/location.entity"
import type { City } from "@/src/cities/domain/city.entity"

export function FictionDetailPageClient({
  fiction,
  initialLocations,
  initialCities,
  initialLikeCount,
  initialLiked,
  sameCityRecommendations,
  sameCityRecommendationPlaceCounts,
}: {
  fiction: FictionWithMedia
  initialLocations: Location[]
  initialCities: City[]
  initialLikeCount: number
  initialLiked: boolean
  sameCityRecommendations?: FictionWithMedia[]
  sameCityRecommendationPlaceCounts?: Record<string, number>
}) {
  const router = useRouter()
  return (
    <div className="h-full">
      <FictionDetail
        fiction={fiction}
        initialLocations={initialLocations}
        initialCities={initialCities}
        initialLikeCount={initialLikeCount}
        initialLiked={initialLiked}
        sameCityRecommendations={sameCityRecommendations}
        sameCityRecommendationPlaceCounts={sameCityRecommendationPlaceCounts}
        onBack={() => router.push("/fictions")}
      />
    </div>
  )
}
