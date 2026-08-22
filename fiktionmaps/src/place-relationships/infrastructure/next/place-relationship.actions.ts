"use server"

import { revalidatePath, updateTag } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { zodErrorMessage } from "@/lib/validation/http"
import { MODERATOR_ROLES } from "@/src/contributions/domain/contribution.config"
import { ensureUserIsModeratorUseCase } from "@/src/contributions/application/ensure-user-is-moderator.usecase"
import { profilesReaderSupabaseAdapter } from "@/src/contributions/infrastructure/supabase/profiles-reader.supabase"
import { resolveEntityContributionInsertDefaults } from "@/src/contributions/application/resolve-entity-contribution-insert-defaults.usecase"
import { createContributionAction } from "@/src/contributions/infrastructure/next/contribution.actions"
import { addPlaceRelationshipMemberUseCase } from "@/src/place-relationships/application/add-place-relationship-member.usecase"
import { clonePlaceToFictionUseCase } from "@/src/place-relationships/application/clone-place-to-fiction.usecase"
import { createPlaceRelationshipUseCase } from "@/src/place-relationships/application/create-place-relationship.usecase"
import { deletePlaceRelationshipUseCase } from "@/src/place-relationships/application/delete-place-relationship.usecase"
import { getPlaceRelationshipsUseCase } from "@/src/place-relationships/application/get-place-relationships.usecase"
import { removePlaceRelationshipMemberUseCase } from "@/src/place-relationships/application/remove-place-relationship-member.usecase"
import {
  addPlaceRelationshipMemberSchema,
  clonePlaceToFictionSchema,
  createPlaceRelationshipSchema,
  deletePlaceRelationshipSchema,
  getPlaceRelationshipsSchema,
  removePlaceRelationshipMemberSchema,
} from "@/src/place-relationships/domain/place-relationship.schemas"
import { placeRelationshipsSupabaseAdapter } from "@/src/place-relationships/infrastructure/supabase/place-relationship.repository.impl"
import { supabaseRepositoryAdapter as placesRepo } from "@/src/places/infrastructure/supabase/place.repository.impl"
import { getAllPlacesCached } from "@/src/places/infrastructure/next/place.queries"
import type {
  AddPlaceRelationshipMemberResult,
  ClonePlaceToFictionResult,
  CreatePlaceRelationshipResult,
  DeletePlaceRelationshipResult,
  GetPlaceRelationshipsResult,
  RemovePlaceRelationshipMemberResult,
} from "./place-relationship.actions.types"

function touchPlaceTags(placeIds: string[]) {
  updateTag("places")
  for (const placeId of placeIds) {
    updateTag(`place-${placeId}`)
  }
}

async function requireStaff(): Promise<{ userId: string } | { error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return { error: "Unauthorized" }

  const isStaff = await ensureUserIsModeratorUseCase(
    user.id,
    profilesReaderSupabaseAdapter,
    MODERATOR_ROLES,
  )
  if (!isStaff) return { error: "Unauthorized" }

  return { userId: user.id }
}

export async function getPlaceRelationshipsAction(
  input: unknown,
): Promise<GetPlaceRelationshipsResult> {
  const auth = await requireStaff()
  if ("error" in auth) return { success: false, error: auth.error }

  const parsed = getPlaceRelationshipsSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: zodErrorMessage(parsed.error) }
  }

  try {
    const relationships = await getPlaceRelationshipsUseCase(
      parsed.data.placeId,
      placeRelationshipsSupabaseAdapter,
    )
    return { success: true, relationships }
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to load relationships",
    }
  }
}

export async function createPlaceRelationshipAction(
  input: unknown,
): Promise<CreatePlaceRelationshipResult> {
  const auth = await requireStaff()
  if ("error" in auth) return { success: false, error: auth.error }

  const parsed = createPlaceRelationshipSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: zodErrorMessage(parsed.error) }
  }

  try {
    const group = await createPlaceRelationshipUseCase(parsed.data, {
      relationships: placeRelationshipsSupabaseAdapter,
      places: placesRepo,
    })
    touchPlaceTags(group.members.map((m) => m.placeId))
    revalidatePath("/admin")
    return { success: true, placeRelationshipId: group.id }
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to create relationship",
    }
  }
}

export async function addPlaceRelationshipMemberAction(
  input: unknown,
): Promise<AddPlaceRelationshipMemberResult> {
  const auth = await requireStaff()
  if ("error" in auth) return { success: false, error: auth.error }

  const parsed = addPlaceRelationshipMemberSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: zodErrorMessage(parsed.error) }
  }

  try {
    const result = await addPlaceRelationshipMemberUseCase(parsed.data, {
      relationships: placeRelationshipsSupabaseAdapter,
      places: placesRepo,
    })
    touchPlaceTags(result.memberPlaceIds)
    revalidatePath("/admin")
    return { success: true }
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to add member",
    }
  }
}

export async function removePlaceRelationshipMemberAction(
  input: unknown,
): Promise<RemovePlaceRelationshipMemberResult> {
  const auth = await requireStaff()
  if ("error" in auth) return { success: false, error: auth.error }

  const parsed = removePlaceRelationshipMemberSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: zodErrorMessage(parsed.error) }
  }

  try {
    const result = await removePlaceRelationshipMemberUseCase(
      parsed.data,
      placeRelationshipsSupabaseAdapter,
    )
    touchPlaceTags(result.affectedPlaceIds)
    revalidatePath("/admin")
    return { success: true, deletedGroup: result.deletedGroup }
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to remove member",
    }
  }
}

export async function deletePlaceRelationshipAction(
  input: unknown,
): Promise<DeletePlaceRelationshipResult> {
  const auth = await requireStaff()
  if ("error" in auth) return { success: false, error: auth.error }

  const parsed = deletePlaceRelationshipSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: zodErrorMessage(parsed.error) }
  }

  try {
    const result = await deletePlaceRelationshipUseCase(
      parsed.data.placeRelationshipId,
      placeRelationshipsSupabaseAdapter,
    )
    touchPlaceTags(result.memberPlaceIds)
    revalidatePath("/admin")
    return { success: true }
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to delete relationship",
    }
  }
}

export async function clonePlaceToFictionAction(
  input: unknown,
): Promise<ClonePlaceToFictionResult> {
  const auth = await requireStaff()
  if ("error" in auth) return { success: false, error: auth.error }

  const parsed = clonePlaceToFictionSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: zodErrorMessage(parsed.error) }
  }

  const { status, created_by } = resolveEntityContributionInsertDefaults(true, auth.userId)

  try {
    const result = await clonePlaceToFictionUseCase(parsed.data, {
      relationships: placeRelationshipsSupabaseAdapter,
      places: placesRepo,
      status,
      createdBy: created_by,
    })

    try {
      await createContributionAction({
        type: "create_place",
        entityType: "place",
        entityId: result.placeId,
      })
    } catch (e) {
      console.error("[clonePlaceToFictionAction] createContributionAction threw", e)
    }

    touchPlaceTags(result.memberPlaceIds)
    updateTag("contributions")
    revalidatePath("/admin")
    revalidatePath("/contributions")

    const places = await getAllPlacesCached()
    return {
      success: true,
      createdPlaceId: result.placeId,
      placeRelationshipId: result.placeRelationshipId,
      places,
    }
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to clone place",
    }
  }
}
