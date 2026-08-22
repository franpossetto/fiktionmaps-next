import type { FictionWithMedia } from "@/src/fictions/domain/fiction.entity"
import { normalizeImageFocus } from "@/lib/asset-images/image-focus"

export type AssetImageRow = {
  entity_id: string
  role: string
  variant: string
  url: string
  focus_x?: number | null
  focus_y?: number | null
}

export function mapAssetImagesToFiction(
  fiction: Record<string, unknown>,
  rows: AssetImageRow[]
): FictionWithMedia {
  const base = fiction as unknown as FictionWithMedia
  let coverImageThumb: string | null = null
  let coverImage: string | null = null
  let coverImageLg: string | null = null
  let coverImageXl: string | null = null
  let bannerImageLg: string | null = null
  let bannerImageXl: string | null = null
  let coverFocus: { x: number; y: number } | null = null
  let bannerFocus: { x: number; y: number } | null = null
  for (const r of rows) {
    if (r.role === "cover" && r.variant === "xs") coverImageThumb = r.url
    if (r.role === "cover" && r.variant === "sm") coverImage = r.url
    if (r.role === "cover" && r.variant === "lg") coverImageLg = r.url
    if (r.role === "cover" && r.variant === "xl") coverImageXl = r.url
    if (r.role === "banner" && r.variant === "lg") bannerImageLg = r.url
    if (r.role === "banner" && r.variant === "xl") bannerImageXl = r.url
    if (r.role === "cover" && coverFocus == null && (r.focus_x != null || r.focus_y != null)) {
      coverFocus = normalizeImageFocus(r.focus_x, r.focus_y)
    }
    if (r.role === "banner" && bannerFocus == null && (r.focus_x != null || r.focus_y != null)) {
      bannerFocus = normalizeImageFocus(r.focus_x, r.focus_y)
    }
  }
  // Page heroes prefer xl; fall back to lg for assets not yet reprocessed.
  const coverImageLarge = coverImageXl ?? coverImageLg
  const bannerImage = bannerImageXl ?? bannerImageLg
  return {
    ...base,
    coverImageThumb: coverImageThumb ?? undefined,
    coverImage: coverImage ?? undefined,
    coverImageLarge: coverImageLarge ?? undefined,
    bannerImage: bannerImage ?? undefined,
    coverFocus: coverFocus ?? undefined,
    bannerFocus: bannerFocus ?? undefined,
  }
}
