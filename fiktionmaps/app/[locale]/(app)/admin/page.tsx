import { Suspense } from "react"
import { getAllFictionsCached } from "@/src/fictions/infrastructure/next/fiction.queries"
import { getAllCitiesCached } from "@/src/cities/infrastructure/next/city.queries"
import { getAllPlacesCached } from "@/src/places/infrastructure/next/place.queries"
import { getAllPersonsCached } from "@/src/persons/infrastructure/next/person.queries"
import { AdminDashboard } from "@/components/admin/admin-dashboard"

export default async function AdminPage() {
  const [initialFictions, initialCities, initialLocations, initialPersons] = await Promise.all([
    getAllFictionsCached(),
    getAllCitiesCached(),
    getAllPlacesCached(),
    getAllPersonsCached(),
  ])
  return (
    <div className="flex h-full min-h-0 flex-col">
      <Suspense>
        <AdminDashboard
          initialFictions={initialFictions}
          initialCities={initialCities}
          initialLocations={initialLocations}
          initialPersons={initialPersons}
        />
      </Suspense>
    </div>
  )
}
