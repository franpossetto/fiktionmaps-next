import type { FictionInterest } from "./fiction-interest.entity"

export interface FictionInterestsRepositoryPort {
  getInterestIdsByFictionId(fictionId: string): Promise<string[]>
  getByInterestIds(interestIds: string[]): Promise<FictionInterest[]>
  setForFiction(fictionId: string, interestIds: string[]): Promise<void>
}
