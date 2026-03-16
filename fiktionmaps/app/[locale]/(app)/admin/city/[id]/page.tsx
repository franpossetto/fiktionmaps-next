import { notFound } from "next/navigation"
import { getCityById } from "@/lib/app-services"
import { CityEditView } from "@/components/admin/city-edit-view"

interface AdminCityEditPageProps {
  params: Promise<{ locale: string; id: string }>
}

export default async function AdminCityEditPage({ params }: AdminCityEditPageProps) {
  const { id } = await params
  const city = await getCityById(id)
  if (!city) notFound()

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto bg-background text-foreground">
      <CityEditView initialCity={city} />
    </div>
  )
}
