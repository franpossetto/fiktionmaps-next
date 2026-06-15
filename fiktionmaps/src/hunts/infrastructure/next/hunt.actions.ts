"use server"

import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { getIsUserContributor } from "@/src/users/infrastructure/next/user.queries"
import { addHuntSourceUseCase } from "@/src/hunts/application/add-hunt-source.usecase"
import { scrapeHuntSourceUseCase } from "@/src/hunts/application/scrape-hunt-source.usecase"
import { deleteHuntSourceUseCase } from "@/src/hunts/application/delete-hunt-source.usecase"
import { createHuntUseCase } from "@/src/hunts/application/create-hunt.usecase"
import { finishHuntReviewUseCase } from "@/src/hunts/application/finish-hunt-review.usecase"
import { previewHuntUseCase } from "@/src/hunts/application/preview-hunt.usecase"
import { huntSourcesSupabaseAdapter } from "@/src/hunts/infrastructure/supabase/hunt-source.repository.impl"
import { huntsSupabaseAdapter } from "@/src/hunts/infrastructure/supabase/hunt.repository.impl"
import { supabaseRepositoryAdapter as placesRepo } from "@/src/places/infrastructure/supabase/place.repository.impl"
import { createFictionsSupabaseAdapter } from "@/src/fictions/infrastructure/supabase/fiction.repository.impl"
import { getLLMProvider } from "@/lib/ai/get-llm-provider"
import { getGeocodingProvider } from "@/src/hunts/infrastructure/geocoding/get-geocoding-provider"
import type { HuntResult } from "@/src/hunts/domain/hunt.types"
import type { HuntSource } from "@/src/hunts/domain/hunt-source.entity"
import type { Hunt } from "@/src/hunts/domain/hunt.entity"
import type { HuntPlaceReviewed } from "@/src/hunts/domain/hunt.types"
import { revalidatePath } from "next/cache"

// ── Auth helper ──────────────────────────────────────────────────────────────

async function requireContributor(): Promise<{ userId: string } | { error: string }> {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return { error: "Unauthorized" }
  const isContributor = await getIsUserContributor(user.id)
  if (!isContributor) return { error: "Forbidden" }
  return { userId: user.id }
}

// ── Add hunt source ──────────────────────────────────────────────────────────

const addHuntSourceSchema = z.object({
  fictionId: z.string().uuid().nullable().optional(),
  contextLabel: z.string().min(1).max(120).nullable().optional(),
  sourceUrl: z.string().url("Invalid URL"),
  researchNote: z.string().max(500).optional(),
})

type AddHuntSourceResult =
  | { success: true; data: HuntSource }
  | { success: false; error: string }

export async function addHuntSourceAction(input: unknown): Promise<AddHuntSourceResult> {
  const auth = await requireContributor()
  if ("error" in auth) return { success: false, error: auth.error }

  const parsed = addHuntSourceSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid input" }

  const fictionsRepo = createFictionsSupabaseAdapter(createClient)

  try {
    const source = await addHuntSourceUseCase(
      {
        fictionId: parsed.data.fictionId ?? null,
        contextLabel: parsed.data.contextLabel ?? null,
        sourceUrl: parsed.data.sourceUrl,
        researchNote: parsed.data.researchNote,
      },
      auth.userId,
      fictionsRepo,
      huntSourcesSupabaseAdapter,
    )
    revalidatePath("/contribute/hunt")
    return { success: true, data: source }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to add source" }
  }
}

// ── Scrape hunt source ────────────────────────────────────────────────────────

type ScrapeHuntSourceResult =
  | { success: true }
  | { success: false; error: string }

export async function scrapeHuntSourceAction(sourceId: string): Promise<ScrapeHuntSourceResult> {
  const auth = await requireContributor()
  if ("error" in auth) return { success: false, error: auth.error }

  try {
    await scrapeHuntSourceUseCase(sourceId, auth.userId, huntSourcesSupabaseAdapter)
    revalidatePath("/contribute/hunt")
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Scrape failed" }
  }
}

// ── Delete hunt source ────────────────────────────────────────────────────────

type DeleteHuntSourceResult =
  | { success: true }
  | { success: false; error: string }

export async function deleteHuntSourceAction(sourceId: string): Promise<DeleteHuntSourceResult> {
  const auth = await requireContributor()
  if ("error" in auth) return { success: false, error: auth.error }

  try {
    await deleteHuntSourceUseCase(sourceId, auth.userId, huntSourcesSupabaseAdapter)
    revalidatePath("/contribute/hunt")
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to delete source" }
  }
}

// ── Create hunt (run pipeline from cached markdown) ──────────────────────────

type CreateHuntResult =
  | { success: true; data: Hunt }
  | { success: false; error: string }

export async function createHuntAction(sourceId: string): Promise<CreateHuntResult> {
  const auth = await requireContributor()
  if ("error" in auth) return { success: false, error: auth.error }

  const fictionsRepo = createFictionsSupabaseAdapter(createClient)
  const llm = getLLMProvider()
  const geocoder = getGeocodingProvider()

  try {
    const hunt = await createHuntUseCase(
      sourceId,
      auth.userId,
      huntSourcesSupabaseAdapter,
      huntsSupabaseAdapter,
      placesRepo,
      fictionsRepo,
      llm,
      geocoder,
    )
    revalidatePath("/contribute/hunt")
    return { success: true, data: hunt }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Hunt failed" }
  }
}

// ── Finish hunt review ────────────────────────────────────────────────────────

const finishHuntReviewSchema = z.object({
  huntId: z.string().uuid(),
  places: z.array(z.unknown()),
  hunterNote: z.string().max(1000).nullable().optional(),
})

type FinishHuntReviewResult =
  | { success: true; data: Hunt }
  | { success: false; error: string }

export async function finishHuntReviewAction(input: unknown): Promise<FinishHuntReviewResult> {
  const auth = await requireContributor()
  if ("error" in auth) return { success: false, error: auth.error }

  const parsed = finishHuntReviewSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid input" }

  try {
    const hunt = await finishHuntReviewUseCase(
      {
        huntId: parsed.data.huntId,
        places: parsed.data.places as HuntPlaceReviewed[],
        hunterNote: parsed.data.hunterNote ?? null,
      },
      auth.userId,
      huntsSupabaseAdapter,
    )
    revalidatePath("/contribute/hunt")
    return { success: true, data: hunt }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to finish review" }
  }
}

// ── Legacy previewHuntAction (kept for backward compat) ──────────────────────

const previewHuntSchema = z.object({
  source_url: z.string().url("Invalid URL"),
  fiction_id: z.string().uuid("Invalid fiction"),
})

type PreviewHuntResult =
  | { success: true; data: HuntResult }
  | { success: false; error: string }

export async function previewHuntAction(input: unknown): Promise<PreviewHuntResult> {
  const auth = await requireContributor()
  if ("error" in auth) return { success: false, error: auth.error }

  const parsed = previewHuntSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid input" }

  try {
    const fictionsRepo = createFictionsSupabaseAdapter(createClient)
    const llm = getLLMProvider()
    const geocoder = getGeocodingProvider()
    const result = await previewHuntUseCase(
      parsed.data.source_url,
      parsed.data.fiction_id,
      placesRepo,
      fictionsRepo,
      llm,
      geocoder,
    )
    return { success: true, data: result }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Hunt failed" }
  }
}
