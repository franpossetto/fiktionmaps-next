import { getCitiesWithScenesForViewer, getCityFictionsWithScenesForViewer } from "@/lib/server/queries"
import { SceneViewer } from "@/components/scenes/scene-viewer"

export default async function ScenesPage() {
  const cities = await getCitiesWithScenesForViewer()
  const initialCity = cities.length > 0 ? cities[0] : null
  const initialAvailableFictions = initialCity
    ? await getCityFictionsWithScenesForViewer(initialCity.id)
    : []

  return (
    <SceneViewer
      initialCities={cities}
      initialSelectedCity={initialCity}
      initialAvailableFictions={initialAvailableFictions}
    />
  )
}
