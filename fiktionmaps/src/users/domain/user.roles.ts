import type { UserRole } from "@/src/users/domain/user.dtos"

/** Application roles allowed to moderate contributions and bypass pending entity inserts server-side (`MODERATOR_ROLES` in contributions). */
export const STAFF_ROLES = ["moderator", "admin"] as const satisfies readonly UserRole[]

export function isStaffUserRole(role: UserRole): boolean {
  return role === "admin" || role === "moderator"
}
