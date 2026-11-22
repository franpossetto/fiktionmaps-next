import { detectAssetImageFormatFromUrl } from "@/lib/asset-images/detect-asset-image-format"
import { encodeImageVariant } from "@/lib/asset-images/encode-image-variant"
import { DEFAULT_IMAGE_FOCUS, normalizeImageFocus } from "@/lib/asset-images/image-focus"
import type { EntityType, ImageRole } from "@/lib/asset-images/image-variant-service"
import {
  ASSET_IMAGES_BUCKET,
  VARIANT_SIZES,
  type ImageCodec,
  type ImageVariant,
} from "@/lib/asset-images/variant-sizes"
import type { AssetImageRepairRepositoryPort } from "@/src/asset-images/domain/asset-image-repair.repository"
import { listAssetRoleFormatInventoryUseCase } from "@/src/asset-images/application/list-asset-role-format-inventory.usecase"
import type { ProbePublicAssetUrl } from "@/src/asset-images/application/list-asset-role-format-inventory.usecase"

const SOURCE_PRIORITY: readonly ImageVariant[] = ["xl", "lg", "sm", "xs"]

function storagePathFromPublicUrl(url: string): string | null {
  try {
    const pathname = new URL(url).pathname
    const prefix = `/storage/v1/object/public/${ASSET_IMAGES_BUCKET}/`
    if (!pathname.startsWith(prefix)) return null
    const path = pathname.slice(prefix.length)
    return path ? decodeURIComponent(path) : null
  } catch {
    return null
  }
}

function pickLargestPresentSource(
  variants: { variant: ImageVariant; present: boolean; url: string | null }[],
): string | null {
  for (const preferred of SOURCE_PRIORITY) {
    const row = variants.find((item) => item.variant === preferred && item.present && item.url?.trim())
    if (row?.url) return row.url.trim()
  }
  return null
}

function fileNameForVariant(variant: ImageVariant, extension: ImageCodec, version: number): string {
  return variant === "xs"
    ? `xs_${VARIANT_SIZES.xs}_${version}.${extension}`
    : `${variant}_${version}.${extension}`
}

export type RepairMissingAssetVariantsInput = {
  entityType: EntityType
  entityId: string
  role: ImageRole
  expectedVariants: readonly ImageVariant[]
}

export type RepairMissingAssetVariantsResult =
  | { success: true; repaired: ImageVariant[] }
  | { success: false; error: string }

export async function repairMissingAssetVariantsUseCase(
  input: RepairMissingAssetVariantsInput,
  repo: AssetImageRepairRepositoryPort,
  probePublicAssetUrl: ProbePublicAssetUrl,
): Promise<RepairMissingAssetVariantsResult> {
  if (!input.entityId.trim()) {
    return { success: false, error: "Missing entity id" }
  }

  const inventory = await listAssetRoleFormatInventoryUseCase(
    {
      entityType: input.entityType,
      entityId: input.entityId,
      role: input.role,
      expectedVariants: input.expectedVariants,
    },
    repo,
    probePublicAssetUrl,
  )

  const missing = inventory.variants
    .filter((item) => !item.hasRow || item.objectMissing)
    .map((item) => item.variant)

  if (missing.length === 0) {
    return { success: true, repaired: [] }
  }

  const sourceUrl = pickLargestPresentSource(inventory.variants)
  if (!sourceUrl) {
    return { success: false, error: "No reachable source photo to derive missing variants" }
  }

  const sourcePath = storagePathFromPublicUrl(sourceUrl)
  if (!sourcePath) return { success: false, error: "Could not resolve source storage path" }

  const source = await repo.downloadObject(sourcePath)
  if (!source.data) {
    return { success: false, error: source.error ?? "Failed to download source image" }
  }

  const rows = await repo.listByEntityRole(input.entityType, input.entityId, input.role)
  const sourceRow = rows.find((row) => row.url === sourceUrl)
  const focus = normalizeImageFocus(
    sourceRow?.focusX ?? DEFAULT_IMAGE_FOCUS.x,
    sourceRow?.focusY ?? DEFAULT_IMAGE_FOCUS.y,
  )
  const staleUrlByVariant = new Map(
    rows.filter((row) => row.url).map((row) => [row.variant, row.url]),
  )
  const sourceFormat = detectAssetImageFormatFromUrl(sourceUrl)
  const codec: ImageCodec = sourceFormat === "avif" ? "avif" : "webp"
  const sourceBuffer = Buffer.from(source.data)
  const version = Date.now()
  const repaired: ImageVariant[] = []

  for (const variant of missing) {
    const encoded = await encodeImageVariant(sourceBuffer, variant, codec)
    const fileName = fileNameForVariant(variant, encoded.extension, version)
    const storagePath = `${input.entityType}/${input.entityId}/${input.role}/${fileName}`
    const upload = await repo.uploadObject(storagePath, encoded.buffer, encoded.contentType)
    if (!upload.url) {
      return { success: false, error: `Upload failed (${variant}): ${upload.error ?? "unknown error"}` }
    }

    const upsertError = await repo.upsertVariant({
      entityType: input.entityType,
      entityId: input.entityId,
      role: input.role,
      variant,
      url: upload.url,
      focusX: focus.x,
      focusY: focus.y,
    })
    if (upsertError) {
      await repo.removeObject(storagePath)
      return { success: false, error: `Failed to save ${variant} record: ${upsertError}` }
    }

    const oldUrl = staleUrlByVariant.get(variant)
    const oldPath = oldUrl ? storagePathFromPublicUrl(oldUrl) : null
    if (oldPath && oldPath !== storagePath) await repo.removeObject(oldPath)
    repaired.push(variant)
  }

  return { success: true, repaired }
}
