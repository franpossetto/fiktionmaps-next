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
}: {
  fiction: FictionWithMedia
  initialLocations: Location[]
  initialCities: City[]
}) {
  const router = useRouter()
  return (
    <div className="h-full">
      <FictionDetail
        fiction={fiction}
        initialLocations={initialLocations}
        initialCities={initialCities}
        onBack={() => router.push("/fictions")}
      />
    </div>
  )
}
