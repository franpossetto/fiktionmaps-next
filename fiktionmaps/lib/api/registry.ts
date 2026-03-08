import { MockCityRepository } from "@/lib/modules/cities/city.mock"
import { ApiCityRepository } from "@/lib/modules/cities/city.api"
import { CityService } from "@/lib/modules/cities/city.service"
import { MockFictionRepository } from "@/lib/modules/fictions/fiction.mock"
import { ApiFictionRepository } from "@/lib/modules/fictions/fiction.api"
import { FictionService } from "@/lib/modules/fictions/fiction.service"
import { MockLocationRepository } from "@/lib/modules/locations/location.mock"
import { ApiLocationRepository } from "@/lib/modules/locations/location.api"
import { LocationService } from "@/lib/modules/locations/location.service"
import { MockSceneRepository } from "@/lib/modules/scenes/scene.mock"
import { ApiSceneRepository } from "@/lib/modules/scenes/scene.api"
import { SceneService } from "@/lib/modules/scenes/scene.service"
import { MockTourRepository } from "@/lib/modules/tours/tour.mock"
import { ApiTourRepository } from "@/lib/modules/tours/tour.api"
import { TourService } from "@/lib/modules/tours/tour.service"
import { MockUserRepository } from "@/lib/modules/users/user.mock"
import { ApiUserRepository } from "@/lib/modules/users/user.api"
import { UserService } from "@/lib/modules/users/user.service"
import type { ApiServices, Repositories } from "./types"

function createMockRepositories(): Repositories {
  return {
    city: new MockCityRepository(),
    fiction: new MockFictionRepository(),
    location: new MockLocationRepository(),
    scene: new MockSceneRepository(),
    tour: new MockTourRepository(),
    user: new MockUserRepository(),
  }
}

function createApiRepositories(baseUrl: string): Repositories {
  return {
    city: new ApiCityRepository(baseUrl),
    fiction: new ApiFictionRepository(baseUrl),
    location: new ApiLocationRepository(baseUrl),
    scene: new ApiSceneRepository(baseUrl),
    tour: new ApiTourRepository(baseUrl),
    user: new ApiUserRepository(baseUrl),
  }
}

export function createServices(): ApiServices {
  const mode = process.env.NEXT_PUBLIC_API_MODE ?? "mock"

  const repos =
    mode === "api"
      ? createApiRepositories(process.env.NEXT_PUBLIC_API_URL ?? "")
      : createMockRepositories()

  return {
    cities: new CityService(repos.city, repos.location, repos.fiction),
    fictions: new FictionService(repos.fiction, repos.location, repos.city),
    locations: new LocationService(repos.location),
    scenes: new SceneService(repos.scene),
    tours: new TourService(repos.tour, repos.location, repos.fiction, repos.city),
    users: new UserService(repos.user),
  }
}
