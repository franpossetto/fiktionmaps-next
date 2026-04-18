export interface FictionLikesRepositoryPort {
  countByIds(fictionIds: string[]): Promise<Record<string, number>>
  getLikedFictionIdsByUserId(userId: string): Promise<string[]>
  toggle(userId: string, fictionId: string): Promise<{ liked: boolean; likeCount: number }>
  setForUser(userId: string, fictionIds: string[]): Promise<void>
}
