import { Suspense } from "react"
import { getAllCities, getAllFictions, getAllPlaces } from "@/src/server"
import { AdminDashboard } from "@/components/admin/admin-dashboard"

export default async function AdminPage() {
  const [initialFictions, initialCities, initialLocations] = await Promise.all([
    getAllFictions(),
    getAllCities(),
    getAllPlaces(),
  ])
  return (
    <Suspense>
      <AdminDashboard
        initialFictions={initialFictions}
        initialCities={initialCities}
        initialLocations={initialLocations}
      />
    </Suspense>
  )
}
