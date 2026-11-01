import type {
  ProfileContributionsPageInput,
  ProfileContributionsPageResult,
  ContributionsRepositoryPort,
} from "@/src/contributions/domain/contribution.repository"

export async function listProfileContributionsPageUseCase(
  input: ProfileContributionsPageInput,
  repo: ContributionsRepositoryPort,
): Promise<ProfileContributionsPageResult> {
  return repo.listProfileContributionsPage(input)
}
