import type { CitiesRepositoryPort } from "@/src/cities/domain/city.repository"

export async function deleteCityUseCase(id: string, repo: CitiesRepositoryPort): Promise<boolean> {
  return repo.delete(id)
}
