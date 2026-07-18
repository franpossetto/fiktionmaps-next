"use client"

import {
  ensureAssetImageXsAction,
  type EnsureAssetImageXsActionResult,
} from "@/src/asset-images/infrastructure/next/asset-image.actions"
import type { EntityType, ImageRole } from "@/lib/asset-images/image-variant-service"

export type EnsureXsTarget = {
  entityType: EntityType
  entityId: string
  role: ImageRole
}

const ensureInflight = new Map<string, Promise<EnsureAssetImageXsActionResult>>()
/** Remember settled results so place-list identity changes don't re-hit the server. */
const ensureSettled = new Map<string, EnsureAssetImageXsActionResult>()

/** Deduped client-side trigger for lazy xs backfill. Never rejects (avoids Next overlay). */
export function ensureXsOnce(target: EnsureXsTarget): Promise<EnsureAssetImageXsActionResult> {
  const key = `${target.entityType}:${target.entityId}:${target.role}`
  const settled = ensureSettled.get(key)
  if (settled) return Promise.resolve(settled)
  const existing = ensureInflight.get(key)
  if (existing) return existing
  const promise = ensureAssetImageXsAction(target)
    .then((result) => {
      ensureSettled.set(key, result)
      return result
    })
    .catch((error): EnsureAssetImageXsActionResult => {
      const result: EnsureAssetImageXsActionResult = {
        success: false,
        error: error instanceof Error ? error.message : "Failed to ensure xs",
      }
      ensureSettled.set(key, result)
      return result
    })
    .finally(() => {
      ensureInflight.delete(key)
    })
  ensureInflight.set(key, promise)
  return promise
}
