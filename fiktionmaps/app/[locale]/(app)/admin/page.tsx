import { Suspense } from "react"
import { getAllFictionsCached } from "@/src/fictions/infrastructure/next/fiction.queries"
import { getAllCitiesCached } from "@/src/cities/infrastructure/next/city.queries"
import { getAllPlacesCached } from "@/src/places/infrastructure/next/place.queries"
import { getAllPersonsCached } from "@/src/persons/infrastructure/next/person.queries"
import { AdminDashboard } from "@/components/admin/admin-dashboard"

export default async function AdminPage() {
  const [initialFictions, initialCities, initialPlaces, initialPersons] = await Promise.all([
    getAllFictionsCached(),
    getAllCitiesCached(),
    getAllPlacesCached(),
    getAllPersonsCached(),
  ])
  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-7xl min-w-0 flex-col px-5">
      <Suspense>
        <AdminDashboard
          initialFictions={initialFictions}
          initialCities={initialCities}
          initialPlaces={initialPlaces}
          initialPersons={initialPersons}
        />
      </Suspense>
    </div>
  )
}
