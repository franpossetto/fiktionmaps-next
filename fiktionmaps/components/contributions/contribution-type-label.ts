import type { ContributionType } from "@/src/contributions/domain/contribution.entity"

/** `Contributions` namespace message key for contribution row `type`. */
export function contributionTypeMessageKey(type: ContributionType): string {
  return `contributionType_${type}`
}
