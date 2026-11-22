import { detectAssetImageFormatFromUrl } from "@/lib/asset-images/detect-asset-image-format"
import type { ImageVariant } from "@/lib/asset-images/variant-sizes"
import type { AssetRoleFormatInventory } from "@/src/asset-images/domain/asset-image.entity"
import type { AssetImagesRepositoryPort } from "@/src/asset-images/domain/asset-image.repository"

export type ProbePublicAssetUrl = (url: string) => Promise<{
  reachable: boolean
  missing: boolean
  byteLength: number | null
}>

export type ListAssetRoleFormatInventoryInput = {
  entityType: string
  entityId: string
  role: string
  expectedVariants: readonly ImageVariant[]
}

export async function listAssetRoleFormatInventoryUseCase(
  input: ListAssetRoleFormatInventoryInput,
  repo: AssetImagesRepositoryPort,
  probePublicAssetUrl: ProbePublicAssetUrl,
): Promise<AssetRoleFormatInventory> {
  const rows = await repo.listByEntityRole(input.entityType, input.entityId, input.role)
  const byVariant = new Map<string, string>()
  for (const row of rows) {
    byVariant.set(row.variant, row.url)
  }

  const variants = await Promise.all(
    input.expectedVariants.map(async (variant) => {
      const url = byVariant.get(variant)?.trim() || null
      const hasRow = Boolean(url)
      const probe = url
        ? await probePublicAssetUrl(url)
        : { reachable: false, missing: false, byteLength: null }
      const present = hasRow && probe.reachable
      const format = detectAssetImageFormatFromUrl(url)
      return {
        variant,
        hasRow,
        present,
        objectMissing: hasRow && probe.missing,
        probeFailed: hasRow && !probe.reachable && !probe.missing,
        format,
        ok: present && format === "avif",
        url,
        byteLength: present ? probe.byteLength : null,
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
