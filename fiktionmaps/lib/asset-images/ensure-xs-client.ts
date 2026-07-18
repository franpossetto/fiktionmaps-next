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

/** Deduped client-side trigger for lazy xs backfill. */
export function ensureXsOnce(target: EnsureXsTarget): Promise<EnsureAssetImageXsActionResult> {
  const key = `${target.entityType}:${target.entityId}:${target.role}`
  const existing = ensureInflight.get(key)
  if (existing) return existing
  const promise = ensureAssetImageXsAction(target).finally(() => {
    ensureInflight.delete(key)
  })
  ensureInflight.set(key, promise)
  return promise
}
