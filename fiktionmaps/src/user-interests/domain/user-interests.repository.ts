export interface UserInterestsRepositoryPort {
  getInterestIdsByUserId(userId: string): Promise<string[]>
  setForUser(userId: string, interestIds: string[]): Promise<void>
}
