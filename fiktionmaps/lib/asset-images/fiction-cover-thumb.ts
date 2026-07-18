import { DEFAULT_FICTION_COVER } from "@/lib/constants/placeholders"
import { pickAssetThumbUrl } from "@/lib/asset-images/variant-sizes"
import type { FictionWithMedia } from "@/src/fictions/domain/fiction.entity"

/** Smallest available fiction cover URL for chips / dense lists. */
export function fictionCoverThumbUrl(fiction: Pick<
  FictionWithMedia,
  "coverImageThumb" | "coverImage" | "coverImageLarge"
>): string {
  return (
    pickAssetThumbUrl({
      xs: fiction.coverImageThumb,
      sm: fiction.coverImage,
      lg: fiction.coverImageLarge,
    }) ?? DEFAULT_FICTION_COVER
  )
}
