import type { FictionWithMedia } from "./fiction.domain"

export type AssetImageRow = { entity_id: string; role: string; variant: string; url: string }

export function mapAssetImagesToFiction(
  fiction: Record<string, unknown>,
  rows: AssetImageRow[]
): FictionWithMedia {
  const base = fiction as unknown as FictionWithMedia
  let coverImage: string | null = null
  let coverImageLarge: string | null = null
  let bannerImage: string | null = null
  for (const r of rows) {
    if (r.role === "cover" && r.variant === "sm") coverImage = r.url
    if (r.role === "cover" && r.variant === "lg") coverImageLarge = r.url
    if (r.role === "banner" && r.variant === "lg") bannerImage = r.url
  }
  return {
    ...base,
    coverImage: coverImage ?? undefined,
    coverImageLarge: coverImageLarge ?? undefined,
    bannerImage: bannerImage ?? undefined,
  }
}
