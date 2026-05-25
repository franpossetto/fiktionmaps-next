import type { PlacesRepositoryPort } from "@/src/places/domain/place.repository"
import type { SitemapPlaceEntry } from "@/src/places/domain/place-sitemap.entity"

export type { SitemapPlaceEntry }

export async function listActivePlacesForSitemapUseCase(
  repo: PlacesRepositoryPort,
): Promise<SitemapPlaceEntry[]> {
  return repo.listActivePlacesForSitemap()
}
