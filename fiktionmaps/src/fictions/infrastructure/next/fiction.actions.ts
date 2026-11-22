"use server"

import { revalidatePath, updateTag } from "next/cache"
import { z } from "zod"
import { zodErrorMessage } from "@/lib/validation/http"
import { interestIdsBodySchema } from "@/lib/validation/api-payloads"
import { isUuidString, uuidSchema } from "@/lib/validation/primitives"
import { createClient } from "@/lib/supabase/server"
import { MODERATOR_ROLES } from "@/src/contributions/domain/contribution.config"
import { ensureUserIsModeratorUseCase } from "@/src/contributions/application/ensure-user-is-moderator.usecase"
import { profilesReaderSupabaseAdapter } from "@/src/contributions/infrastructure/supabase/profiles-reader.supabase"
import { supabaseRepositoryAdapter as contributionsRepo } from "@/src/contributions/infrastructure/supabase/contribution.repository.impl"
import { supabaseRepositoryAdapter as fictionsRepo } from "@/src/fictions/infrastructure/supabase/fiction.repository.impl"
import { supabaseRepositoryAdapter as fictionInterestsRepo } from "@/src/fiction-interests/infrastructure/supabase/fiction-interests.repository.impl"
import { supabaseRepositoryAdapter as fictionExternalIdsRepo } from "@/src/fiction-external-ids/infrastructure/supabase/fiction-external-ids.repository.impl"
import { supabaseRepositoryAdapter as personsRepo } from "@/src/persons/infrastructure/supabase/person.repository.impl"
import { resolveOrCreatePerson } from "@/src/persons/application/resolve-or-create-person.usecase"
import { linkFictionPrimaryCreditUseCase } from "@/src/fictions/application/link-fiction-primary-credit.usecase"
import type { FictionWithMedia } from "@/src/fictions/domain/fiction.entity"
import {
  parseCreateFictionFormData,
  parseImdbIdFromFormData,
  parseUpdateFictionFormData,
} from "./fiction.form-parsers"
import { createFictionWithMediaUseCase } from "@/src/fictions/application/create-fiction-with-media.usecase"
import { updateFictionUseCase } from "@/src/fictions/application/update-fiction.usecase"
import { deleteFictionUseCase } from "@/src/fictions/application/delete-fiction.usecase"
import { findFictionDuplicateForContributeUseCase } from "@/src/fictions/application/find-fiction-duplicate-for-contribute.usecase"
import { resolveContributorFictionCreateDefaults } from "@/src/fictions/application/resolve-contributor-fiction-create-defaults.usecase"
import { getFictionInterestsUseCase } from "@/src/fiction-interests/application/get-fiction-interests.usecase"
import { setFictionInterestsUseCase } from "@/src/fiction-interests/application/set-fiction-interests.usecase"
import { getRecommendedFictionsUseCase } from "@/src/fictions/application/get-recommended-fictions.usecase"
import { resolveNavSearchScopeUseCase } from "@/src/fictions/application/resolve-nav-search-scope.usecase"
import {
  getFictionPhotoContributeContextUseCase,
  type FictionPhotoContributeContext,
} from "@/src/fictions/application/get-fiction-photo-contribute-context.usecase"
import { parseFictionAppRoute } from "@/lib/navigation/parse-fiction-app-route"
import type { NavSearchScope } from "@/src/fictions/domain/nav-search-scope"
import { resolvePlaceForFictionPathCached } from "@/src/places/infrastructure/next/place.queries"
import { parseImageFocusFromFormData } from "@/lib/asset-images/image-focus"
import { uploadEntityImage, validateImageFile } from "@/lib/asset-images/image-variant-service"
import {
  BANNER_UPLOAD_VARIANTS,
  THUMB_UPLOAD_VARIANTS,
} from "@/lib/asset-images/variant-sizes"
import {
  getFictionByIdCached,
  getFictionBySlugCached,
  getFictionCitiesCached,
  getFictionDetailRecommendations,
  getFictionLikeCountsByIds,
  getActiveFictionsCached,
  loadRecommendedFictionsDeps,
} from "./fiction.queries"
import type { City } from "@/src/cities/domain/city.entity"
import type {
  CreateFictionResult,
  UpdateFictionResult,
  DeleteFictionResult,
  SetFictionActiveResult,
  UploadFictionImageResult,
  GetFictionInterestsResult,
  SetFictionInterestsResult,
  GetRecommendedFictionsResult,
  GetFictionDetailRecommendationsResult,
  CheckFictionDuplicateForContributeResult,
  LinkFictionPrimaryCreditResult,
} from "./fiction.actions.types"

const checkFictionDuplicateForContributeBodySchema = z.object({
  title: z.string().trim().min(1),
  year: z.coerce.number().int().min(1900).max(new Date().getFullYear()),
  type: z.enum(["movie", "book", "tv-series"]),
  imdbId: z.string(),
})

export async function checkFictionDuplicateForContributeAction(
  input: z.infer<typeof checkFictionDuplicateForContributeBodySchema>,
): Promise<CheckFictionDuplicateForContributeResult> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return { success: false, error: "Unauthorized" }

  const parsed = checkFictionDuplicateForContributeBodySchema.safeParse(input)
  if (!parsed.success) return { success: false, error: zodErrorMessage(parsed.error) }

  try {
    const dup = await findFictionDuplicateForContributeUseCase(
      parsed.data,
      fictionsRepo,
      fictionExternalIdsRepo,
    )
    if (!dup) return { success: true, duplicate: null }
    return {
      success: true,
      duplicate: {
        id: dup.id,
        slug: dup.slug ?? null,
        title: dup.title,
        year: dup.year ?? null,
        type: dup.type,
      },
    }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to check duplicates" }
  }
}

const linkFictionPrimaryCreditBodySchema = z.object({
  fictionId: uuidSchema,
  fictionType: z.enum(["movie", "book", "tv-series"]),
  creditName: z.string().trim().min(1),
  personId: uuidSchema.optional(),
})

export async function linkFictionPrimaryCreditAction(
  input: z.infer<typeof linkFictionPrimaryCreditBodySchema>,
): Promise<LinkFictionPrimaryCreditResult> {
  const parsed = linkFictionPrimaryCreditBodySchema.safeParse(input)
  if (!parsed.success) return { success: false, error: zodErrorMessage(parsed.error) }

  try {
    let personId = parsed.data.personId
    if (!personId) {
      const person = await resolveOrCreatePerson(parsed.data.creditName, personsRepo)
      if (!person) return { success: false, error: "Failed to resolve person" }
      personId = person.id
    }

    await linkFictionPrimaryCreditUseCase(
      {
        fictionId: parsed.data.fictionId,
        fictionType: parsed.data.fictionType,
        personId,
        displayName: parsed.data.creditName,
      },
      personsRepo,
      fictionsRepo,
    )

    revalidatePath("/admin")
    updateTag("fictions")
    return { success: true }
  } catch (e) {
    console.error("[linkFictionPrimaryCreditAction]", e)
    return { success: false, error: e instanceof Error ? e.message : "Failed to link credit" }
  }
}

function parseCreateFictionFormDataWithImdb(formData: FormData) {
  const parsed = parseCreateFictionFormData(formData)
  if (!parsed.success) return { success: false as const, error: zodErrorMessage(parsed.error) }
  const imdbParsed = parseImdbIdFromFormData(formData)
  if (!imdbParsed.success) return { success: false as const, error: zodErrorMessage(imdbParsed.error) }
  return { success: true as const, data: parsed.data, imdbId: imdbParsed.data }
}

function optionalCreateImageFromFormData(
  formData: FormData,
  fileKey: string,
  focusPrefix: string,
): { file: File; focus: { x: number; y: number } } | null {
  const file = formData.get(fileKey)
  if (!(file instanceof File) || file.size === 0) return null
  if (validateImageFile(file)) return null
  return { file, focus: parseImageFocusFromFormData(formData, focusPrefix) }
}

async function uploadFictionCreateImage(input: {
  fictionId: string
  role: "cover" | "banner"
  file: File
  focus: { x: number; y: number }
}): Promise<void> {
  await uploadEntityImage({
    entityType: "fiction",
    entityId: input.fictionId,
    role: input.role,
    variants: input.role === "cover" ? THUMB_UPLOAD_VARIANTS : BANNER_UPLOAD_VARIANTS,
    file: input.file,
    replace: true,
    focus: input.focus,
    codec: "avif",
  })
}

export type {
  CreateFictionResult,
  UpdateFictionResult,
  DeleteFictionResult,
  SetFictionActiveResult,
  UploadFictionImageResult,
  GetFictionInterestsResult,
  SetFictionInterestsResult,
  GetRecommendedFictionsResult,
  GetFictionDetailRecommendationsResult,
} from "./fiction.actions.types"

export async function uploadFictionImageAction(
  fictionId: string,
  role: "cover" | "banner",
  formData: FormData
): Promise<UploadFictionImageResult> {
  const file = formData.get("file") as File | null
  if (!file || !(file instanceof File) || file.size === 0) {
    return { success: false, error: "No file provided" }
  }
  const validationError = validateImageFile(file)
  if (validationError) return { success: false, error: validationError }

  const variants = role === "cover" ? THUMB_UPLOAD_VARIANTS : BANNER_UPLOAD_VARIANTS
  const result = await uploadEntityImage({
    entityType: "fiction",
    entityId: fictionId,
    role,
    variants,
    file,
    replace: true,
    focus: parseImageFocusFromFormData(formData),
    codec: "avif",
  })

  if (!result.success) return result

  revalidatePath(`/admin/fiction/${fictionId}`)
  revalidatePath(`/admin/fiction/${fictionId}/improve-photo`)
  updateTag("fictions")

  if (role === "cover") {
    return {
      success: true,
      coverImage: result.urls.sm,
      coverImageLarge: result.urls.xl ?? result.urls.lg,
    }
  }
  return { success: true, bannerImage: result.urls.xl ?? result.urls.lg }
}

export async function updateFictionAction(id: string, formData: FormData): Promise<UpdateFictionResult> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return { success: false, error: "Unauthorized" }

  const isStaffModerator = await ensureUserIsModeratorUseCase(
    user.id,
    profilesReaderSupabaseAdapter,
    MODERATOR_ROLES,
  )
  if (!isStaffModerator) return { success: false, error: "Unauthorized" }

  if (!uuidSchema.safeParse(id).success) return { success: false, error: "Invalid fictionId" }

  const parsed = parseUpdateFictionFormData(formData)
  if (!parsed.success) return { success: false, error: zodErrorMessage(parsed.error) }

  const fiction = await updateFictionUseCase(id, parsed.data, fictionsRepo)
  if (!fiction) return { success: false, error: "Failed to update fiction" }

  revalidatePath("/admin")
  revalidatePath(`/admin/fiction/${id}`)
  updateTag("fictions")
  return { success: true, fiction }
}

/** Admin and contribute: server sets status, created_by and active from session (client cannot override). */
export async function createFictionWithImagesAction(formData: FormData): Promise<CreateFictionResult> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: "Unauthorized" }
  }

  const isStaffModerator = await ensureUserIsModeratorUseCase(
    user.id,
    profilesReaderSupabaseAdapter,
    MODERATOR_ROLES,
  )
  const defaults = resolveContributorFictionCreateDefaults(isStaffModerator, user.id)

  const fd = new FormData()
  for (const [key, value] of formData.entries()) {
    if (key === "active" || key === "fictionStatus" || key === "createdBy") continue
    fd.append(key, value)
  }
  fd.set("active", String(defaults.active))
  fd.set("fictionStatus", defaults.status)
  fd.set("createdBy", defaults.created_by)

  const parsed = parseCreateFictionFormDataWithImdb(fd)
  if (!parsed.success) return { success: false, error: parsed.error }

  const result = await createFictionWithMediaUseCase(
    {
      userId: user.id,
      autoApproveContribution: isStaffModerator,
      data: parsed.data,
      imdbId: parsed.imdbId,
      cover: optionalCreateImageFromFormData(fd, "coverFile", "cover"),
      banner: optionalCreateImageFromFormData(fd, "bannerFile", "banner"),
    },
    {
      fictionsRepo,
      fictionExternalIdsRepo,
      contributionsRepo,
      uploadFictionImage: uploadFictionCreateImage,
    },
  )
  if (!result.success) return result

  revalidatePath("/admin")
  revalidatePath("/contributions")
  updateTag("fictions")
  updateTag(`fiction-${result.fiction.id}`)
  updateTag("contributions")
  if (result.contributionAutoApproved) updateTag("profiles")

  if (typeof result.contributionAutoApproved === "boolean") {
    return { success: true, fiction: result.fiction, contributionAutoApproved: result.contributionAutoApproved }
  }
  return { success: true, fiction: result.fiction }
}

export async function deleteFictionAction(id: string): Promise<DeleteFictionResult> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return { success: false, error: "Unauthorized" }

  const isStaffModerator = await ensureUserIsModeratorUseCase(
    user.id,
    profilesReaderSupabaseAdapter,
    MODERATOR_ROLES,
  )
  if (!isStaffModerator) return { success: false, error: "Unauthorized" }

  if (!uuidSchema.safeParse(id).success) return { success: false, error: "Invalid fictionId" }

  const ok = await deleteFictionUseCase(id, fictionsRepo)
  if (!ok) return { success: false, error: "Failed to delete fiction" }
  revalidatePath("/admin")
  revalidatePath(`/admin/fiction/${id}`)
  updateTag("fictions")
  return { success: true }
}

export async function setFictionActiveAction(id: string, active: boolean): Promise<SetFictionActiveResult> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return { success: false, error: "Unauthorized" }

  const isStaffModerator = await ensureUserIsModeratorUseCase(
    user.id,
    profilesReaderSupabaseAdapter,
    MODERATOR_ROLES,
  )
  if (!isStaffModerator) return { success: false, error: "Unauthorized" }

  if (!uuidSchema.safeParse(id).success) return { success: false, error: "Invalid fictionId" }

  const fiction = await updateFictionUseCase(id, { active }, fictionsRepo)
  if (!fiction) return { success: false, error: "Failed to update fiction" }
  revalidatePath("/admin")
  revalidatePath(`/admin/fiction/${id}`)
  updateTag("fictions")
  return { success: true, fiction }
}

export async function getFictionInterestsAction(fictionId: string): Promise<GetFictionInterestsResult> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { success: false, error: "Unauthorized" }

  if (!uuidSchema.safeParse(fictionId).success) {
    return { success: false, error: "Invalid fictionId" }
  }

  try {
    const interestIds = await getFictionInterestsUseCase(fictionId, fictionInterestsRepo)
    return { success: true, interestIds }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to load interests" }
  }
}

export async function getFictionLikeCountsAction(fictionIds: string[]): Promise<Record<string, number>> {
  return getFictionLikeCountsByIds(fictionIds)
}

export async function getActiveFictionsAction(): Promise<FictionWithMedia[]> {
  return getActiveFictionsCached()
}

/** Public read: resolve an active fiction from URL slug segment. */
export async function resolvePublicFictionFromSlugAction(
  slug: string,
): Promise<FictionWithMedia | null> {
  const raw = slug.trim()
  if (!raw || isUuidString(raw)) return null
  const fiction = await getFictionBySlugCached(raw)
  if (!fiction?.active) return null
  return fiction
}

/** @deprecated Use resolvePublicFictionFromSlugAction */
export const resolvePublicFictionFromSlugOrIdAction = resolvePublicFictionFromSlugAction

/** Top nav: global search vs chip scoped to current fiction / place page. */
export async function getNavSearchScopeAction(pathname: string): Promise<NavSearchScope> {
  const route = parseFictionAppRoute(pathname)
  if (!route) return { kind: "global" }
  return resolveNavSearchScopeUseCase(route, {
    getFictionBySlug: (slug) => getFictionBySlugCached(slug),
    resolvePlaceForFictionPath: (fictionId, segment) =>
      resolvePlaceForFictionPathCached(fictionId, segment),
  })
}

export async function getFictionCitiesAction(fictionId: string): Promise<City[]> {
  if (!uuidSchema.safeParse(fictionId).success) return []
  return getFictionCitiesCached(fictionId)
}

export async function setFictionInterestsAction(fictionId: string, interestIds: string[]): Promise<SetFictionInterestsResult> {
  const parsed = interestIdsBodySchema.safeParse({ interestIds })
  if (!parsed.success) return { success: false, error: zodErrorMessage(parsed.error) }

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { success: false, error: "Unauthorized" }

  if (!uuidSchema.safeParse(fictionId).success) {
    return { success: false, error: "Invalid fictionId" }
  }

  try {
    await setFictionInterestsUseCase(fictionId, parsed.data.interestIds, fictionInterestsRepo)
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to set interests" }
  }

  revalidatePath("/admin")
  revalidatePath(`/admin/fiction/${fictionId}`)
  updateTag("fictions")
  return { success: true }
}

export async function getRecommendedFictionsAction(limit?: number): Promise<GetRecommendedFictionsResult> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { success: false, error: "Unauthorized" }

  const lim = limit != null && Number.isFinite(limit) ? Math.max(1, Math.min(50, Math.floor(Number(limit)))) : 12

  try {
    const fictions = await getRecommendedFictionsUseCase(user.id, lim, loadRecommendedFictionsDeps())
    return { success: true, fictions }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to load recommendations" }
  }
}

/** Public read: same pipeline as fiction detail (city → interests → random). Loads places if not passed. */
export async function getFictionDetailRecommendationsAction(
  fictionId: string,
  interestIds: string[]
): Promise<GetFictionDetailRecommendationsResult> {
  if (!uuidSchema.safeParse(fictionId).success) {
    return { success: false, error: "Invalid fictionId" }
  }
  const parsed = interestIdsBodySchema.safeParse({ interestIds })
  if (!parsed.success) return { success: false, error: zodErrorMessage(parsed.error) }

  try {
    const { fictions, reason } = await getFictionDetailRecommendations({
      fictionId,
      interestIds: parsed.data.interestIds,
    })
    return { success: true, fictions, reason }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to load recommendations" }
  }
}

export type { FictionPhotoContributeContext } from "@/src/fictions/application/get-fiction-photo-contribute-context.usecase"

export async function getFictionPhotoContributeContextAction(
  fictionId: string,
): Promise<FictionPhotoContributeContext | null> {
  if (!uuidSchema.safeParse(fictionId).success) return null
  return getFictionPhotoContributeContextUseCase(fictionId, fictionsRepo)
}
