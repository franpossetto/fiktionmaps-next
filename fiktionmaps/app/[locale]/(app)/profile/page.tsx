import type { Metadata } from "next"
import { getAllCitiesCached } from "@/src/cities/infrastructure/next/city.queries"
import { getCurrentUserProfileAction } from "@/src/users/infrastructure/next/user.actions"
import {
  getUserCityCheckinsAction,
  getUserPlaceCheckinsEnrichedAction,
} from "@/src/checkins/infrastructure/next/checkin.actions"
import { getUserHomesAction } from "@/src/homes/infrastructure/next/home.actions"
import { getProfileScenesPreviewAction } from "@/src/scenes/infrastructure/next/profile-scene-previews.actions"
import { UserProfileComponent } from "@/components/profile/user-profile"

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
}

export default async function ProfilePage() {
  const [cities, scenePreviews, profileRes, cityCheckinsRes, placeCheckinsRes, homesRes] = await Promise.all([
    getAllCitiesCached(),
    getProfileScenesPreviewAction(),
    getCurrentUserProfileAction(),
    getUserCityCheckinsAction(),
    getUserPlaceCheckinsEnrichedAction(),
    getUserHomesAction(),
  ])
  return (
    <UserProfileComponent
      profile={profileRes.data ?? undefined}
      initialCities={cities}
      initialScenePreviews={scenePreviews}
      initialCheckinBundle={{
        places: placeCheckinsRes.data ?? [],
        cities: cityCheckinsRes.data ?? [],
      }}
      initialHomes={homesRes.data ?? []}
    />
  )
}
