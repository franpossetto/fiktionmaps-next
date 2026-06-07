import { DEFAULT_FICTION_COVER } from "@/lib/constants/placeholders"
import type { FictionsRepositoryPort } from "@/src/fictions/domain/fiction.repository"

export type FictionPhotoContributeContext = {
  fictionId: string
  fictionTitle: string
  fictionSlug: string
  currentCoverUrl: string | null
  currentBannerUrl: string | null
}

export async function getFictionPhotoContributeContextUseCase(
  fictionId: string,
  fictionsRepo: FictionsRepositoryPort,
): Promise<FictionPhotoContributeContext | null> {
  const eligible = await fictionsRepo.isApprovedActiveFiction(fictionId)
  if (!eligible) return null

  const fiction = await fictionsRepo.getById(fictionId)
  if (!fiction) return null

  const coverUrl = (fiction.coverImageLarge ?? fiction.coverImage)?.trim()
  const currentCoverUrl =
    coverUrl && coverUrl !== DEFAULT_FICTION_COVER && !coverUrl.endsWith("/placeholder.svg")
      ? coverUrl
      : null

  const bannerUrl = fiction.bannerImage?.trim()
  const currentBannerUrl =
    bannerUrl && !bannerUrl.endsWith("/placeholder.svg") ? bannerUrl : null

  return {
    fictionId: fiction.id,
    fictionTitle: fiction.title,
    fictionSlug: fiction.slug,
    currentCoverUrl,
    currentBannerUrl,
  }
}
