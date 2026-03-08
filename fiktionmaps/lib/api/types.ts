import type { CityService } from "@/lib/modules/cities/city.service"
import type { FictionService } from "@/lib/modules/fictions/fiction.service"
import type { LocationService } from "@/lib/modules/locations/location.service"
import type { SceneService } from "@/lib/modules/scenes/scene.service"
import type { TourService } from "@/lib/modules/tours/tour.service"
import type { UserService } from "@/lib/modules/users/user.service"
import type { ICityRepository } from "@/lib/modules/cities/city.repository"
import type { IFictionRepository } from "@/lib/modules/fictions/fiction.repository"
import type { ILocationRepository } from "@/lib/modules/locations/location.repository"
import type { ISceneRepository } from "@/lib/modules/scenes/scene.repository"
import type { ITourRepository } from "@/lib/modules/tours/tour.repository"
import type { IUserRepository } from "@/lib/modules/users/user.repository"

export interface Repositories {
  city: ICityRepository
  fiction: IFictionRepository
  location: ILocationRepository
  scene: ISceneRepository
  tour: ITourRepository
  user: IUserRepository
}

export interface ApiServices {
  cities: CityService
  fictions: FictionService
  locations: LocationService
  scenes: SceneService
  tours: TourService
  users: UserService
}
