import type { FictionWithMedia } from "@/src/fictions/domain/fiction.entity"

export type AssetImageRow = { entity_id: string; role: string; variant: string; url: string }

export function mapAssetImagesToFiction(
  fiction: Record<string, unknown>,
  rows: AssetImageRow[]
): FictionWithMedia {
  const base = fiction as unknown as FictionWithMedia
  let coverImageThumb: string | null = null
  let coverImage: string | null = null
  let coverImageLarge: string | null = null
  let bannerImage: string | null = null
  for (const r of rows) {
    if (r.role === "cover" && r.variant === "xs") coverImageThumb = r.url
    if (r.role === "cover" && r.variant === "sm") coverImage = r.url
    if (r.role === "cover" && r.variant === "lg") coverImageLarge = r.url
    if (r.role === "banner" && r.variant === "lg") bannerImage = r.url
  }
  return {
    ...base,
    coverImageThumb: coverImageThumb ?? undefined,
    coverImage: coverImage ?? undefined,
    coverImageLarge: coverImageLarge ?? undefined,
    bannerImage: bannerImage ?? undefined,
  }
}
