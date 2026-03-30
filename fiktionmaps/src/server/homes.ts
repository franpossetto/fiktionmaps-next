import { getSessionUserId } from "@/lib/auth/auth.service"
import { createHomesService, homesSupabaseAdapter } from "@/src/homes"

const homesService = createHomesService({
  homesRepo: homesSupabaseAdapter,
  getCurrentUserId: getSessionUserId,
})

export const getMyHomes = homesService.getMyHomes
export const addHome = homesService.addHome
export const deleteHome = homesService.deleteHome
