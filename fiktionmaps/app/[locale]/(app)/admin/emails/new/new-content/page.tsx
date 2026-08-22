import { EmailNewContentSelect } from "@/components/admin/email-new-content-select"
import { getAllCitiesCached } from "@/src/cities/infrastructure/next/city.queries"
import { listCityIdsWithPlacesCached } from "@/src/places/infrastructure/next/place.queries"

export default async function AdminEmailsNewContentPage() {
  const [cities, cityIdsWithPlaces] = await Promise.all([
    getAllCitiesCached(),
    listCityIdsWithPlacesCached(),
  ])
  const withPlaces = new Set(cityIdsWithPlaces)
  const citiesWithPlaces = cities
    .filter((city) => withPlaces.has(city.id))
    .sort((a, b) => a.name.localeCompare(b.name, "es"))

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <EmailNewContentSelect cities={citiesWithPlaces} />
    </div>
  )
}
