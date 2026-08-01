import type { FictionWithMedia } from "@/src/fictions/domain/fiction.entity"
import type { FictionsRepositoryPort } from "@/src/fictions/domain/fiction.repository"
import type { FictionLikesRepositoryPort } from "@/src/fiction-likes/domain/fiction-likes.repository"

export async function getLikedFictionsForUserUseCase(
  userId: string,
  deps: {
    likes: FictionLikesRepositoryPort
    fictions: Pick<FictionsRepositoryPort, "getByIds">
  },
): Promise<FictionWithMedia[]> {
  const likedIds = await deps.likes.getLikedFictionIdsByUserId(userId)
  if (likedIds.length === 0) return []

  const fictions = await deps.fictions.getByIds(likedIds)
  const byId = new Map(fictions.map((fiction) => [fiction.id, fiction]))

  return likedIds
    .map((id) => byId.get(id))
    .filter((fiction): fiction is FictionWithMedia => !!fiction && fiction.active)
}
