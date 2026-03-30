import { getAllCities, getCityFictions } from "@/lib/app-services"
import { SceneViewer } from "@/components/scenes/scene-viewer"

export default async function ScenesPage() {
  const cities = await getAllCities()
  const initialCity = cities.length > 0 ? cities[0] : null
  const initialAvailableFictions = initialCity ? await getCityFictions(initialCity.id) : []

  return (
    <SceneViewer
      initialCities={cities}
      initialSelectedCity={initialCity}
      initialAvailableFictions={initialAvailableFictions}
    />
  )
}
