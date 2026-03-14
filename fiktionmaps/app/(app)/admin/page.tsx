import { Suspense } from "react"
import { getAllFictions, getAllCities } from "@/lib/users-service"
import { AdminDashboard } from "@/components/admin/admin-dashboard"

export default async function AdminPage() {
  const [initialFictions, initialCities] = await Promise.all([
    getAllFictions(),
    getAllCities(),
  ])
  return (
    <Suspense>
      <AdminDashboard
        initialFictions={initialFictions}
        initialCities={initialCities}
      />
    </Suspense>
  )
}
