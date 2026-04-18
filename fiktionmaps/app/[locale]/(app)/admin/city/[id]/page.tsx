import { notFound } from "next/navigation"
import { getCityByIdCached } from "@/src/cities/infrastructure/next/city.queries"
import { CityEditView } from "@/components/admin/city-edit-view"

interface AdminCityEditPageProps {
  params: Promise<{ locale: string; id: string }>
}

export default async function AdminCityEditPage({ params }: AdminCityEditPageProps) {
  const { id } = await params
  const city = await getCityByIdCached(id)
  if (!city) notFound()

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto bg-background text-foreground">
      <CityEditView initialCity={city} />
    </div>
  )
}
