import { Suspense } from "react"
import { getAllFictionsCached } from "@/src/fictions/infrastructure/next/fiction.queries"
import { getAllCitiesCached } from "@/src/cities/infrastructure/next/city.queries"
import { getAllPlacesCached } from "@/src/places/infrastructure/next/place.queries"
import { AdminDashboard } from "@/components/admin/admin-dashboard"

export default async function AdminPage() {
  const [initialFictions, initialCities, initialLocations] = await Promise.all([
    getAllFictionsCached(),
    getAllCitiesCached(),
    getAllPlacesCached(),
  ])
  return (
    <div className="flex h-full min-h-0 flex-col">
      <Suspense>
        <AdminDashboard
          initialFictions={initialFictions}
          initialCities={initialCities}
          initialLocations={initialLocations}
        />
      </Suspense>
    </div>
  )
}
