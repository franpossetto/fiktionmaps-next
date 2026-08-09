import { detectAssetImageFormatFromUrl } from "@/lib/asset-images/detect-asset-image-format"
import type { ImageVariant } from "@/lib/asset-images/variant-sizes"
import type { AssetRoleFormatInventory } from "@/src/asset-images/domain/asset-image.entity"
import type { AssetImagesRepositoryPort } from "@/src/asset-images/domain/asset-image.repository"

export type ListAssetRoleFormatInventoryInput = {
  entityType: string
  entityId: string
  role: string
  expectedVariants: readonly ImageVariant[]
}

async function fetchUrlByteLength(url: string): Promise<number | null> {
  try {
    const res = await fetch(url, { method: "HEAD", cache: "no-store" })
    if (!res.ok) return null
    const raw = res.headers.get("content-length")
    if (!raw) return null
    const n = Number(raw)
    return Number.isFinite(n) && n >= 0 ? n : null
  } catch {
    return null
  }
}

export async function listAssetRoleFormatInventoryUseCase(
  input: ListAssetRoleFormatInventoryInput,
  repo: AssetImagesRepositoryPort,
): Promise<AssetRoleFormatInventory> {
  const rows = await repo.listByEntityRole(input.entityType, input.entityId, input.role)
  const byVariant = new Map<string, string>()
  for (const row of rows) {
    byVariant.set(row.variant, row.url)
  }

  const variants = await Promise.all(
    input.expectedVariants.map(async (variant) => {
      const url = byVariant.get(variant)?.trim() || null
      const present = Boolean(url)
      const format = detectAssetImageFormatFromUrl(url)
      const byteLength = url ? await fetchUrlByteLength(url) : null
      return {
        variant,
        present,
        format,
        ok: present && format === "avif",
        url,
        byteLength,
      }
    }),
  )

  return {
    entityType: input.entityType,
    entityId: input.entityId,
    role: input.role,
    variants,
    allAvifOk: variants.length > 0 && variants.every((v) => v.ok),
  }
}
