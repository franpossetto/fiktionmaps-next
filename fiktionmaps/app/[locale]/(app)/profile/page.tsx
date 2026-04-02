import { getAllCities } from "@/lib/server"
import { getCurrentUserProfileAction } from "@/lib/actions/auth/profile.actions"
import {
  getUserCityCheckinsAction,
  getUserPlaceCheckinsEnrichedAction,
} from "@/lib/actions/checkins/checkin.actions"
import { getUserHomesAction } from "@/lib/actions/homes/home.actions"
import { getProfileScenesPreviewAction } from "@/lib/actions/profile/profile-contributions.actions"
import { UserProfileComponent } from "@/components/profile/user-profile"

export default async function ProfilePage() {
  const [cities, scenePreviews, profileRes, cityCheckinsRes, placeCheckinsRes, homesRes] = await Promise.all([
    getAllCities(),
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
