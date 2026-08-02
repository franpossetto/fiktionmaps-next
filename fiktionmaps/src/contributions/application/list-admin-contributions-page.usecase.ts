import type {
  AdminContributionsListPageInput,
  AdminContributionsListPageResult,
  ContributionsRepositoryPort,
} from "@/src/contributions/domain/contribution.repository"

export async function listAdminContributionsPageUseCase(
  input: AdminContributionsListPageInput,
  repo: ContributionsRepositoryPort,
): Promise<AdminContributionsListPageResult> {
  return repo.listAdminContributionsPage(input)
}
