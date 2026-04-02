import { Suspense } from "react"
import { getAllCities, getAllFictions, getAllPlaces } from "@/lib/server"
import { AdminDashboard } from "@/components/admin/admin-dashboard"

export default async function AdminPage() {
  const [initialFictions, initialCities, initialLocations] = await Promise.all([
    getAllFictions(),
    getAllCities(),
    getAllPlaces(),
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
