import type { ProfilesReaderPort } from "@/src/contributions/domain/profiles-reader.port"

export async function ensureUserIsModeratorUseCase(
  userId: string,
  profilesReader: ProfilesReaderPort,
  allowedRoles: readonly string[],
): Promise<boolean> {
  const role = await profilesReader.getRole(userId)
  if (!role) return false
  return allowedRoles.includes(role)
}
