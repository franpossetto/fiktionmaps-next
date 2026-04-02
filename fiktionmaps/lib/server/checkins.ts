import { getSessionUserId } from "@/lib/auth/auth.service"
import { createCheckinsService, checkinsSupabaseAdapter } from "@/src/checkins"

const checkinsService = createCheckinsService({
  checkinsRepo: checkinsSupabaseAdapter,
  getCurrentUserId: getSessionUserId,
})

export const checkinCity = checkinsService.checkinCity
export const checkinPlace = checkinsService.checkinPlace
export const getMyCityCheckins = checkinsService.getMyCityCheckins
export const getMyPlaceCheckins = checkinsService.getMyPlaceCheckins
