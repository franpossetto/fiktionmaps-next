"use server"

import { revalidatePath, updateTag } from "next/cache"
import { z } from "zod"
import { zodErrorMessage } from "@/lib/validation/http"
import { interestIdsBodySchema } from "@/lib/validation/api-payloads"
import { isUuidString, uuidSchema } from "@/lib/validation/primitives"
import { createClient } from "@/lib/supabase/server"
import { MODERATOR_ROLES } from "@/src/contributions/domain/contribution.config"
import { ensureUserIsModeratorUseCase } from "@/src/contributions/application/ensure-user-is-moderator.usecase"
import { createContributionAction } from "@/src/contributions/infrastructure/next/contribution.actions"
import { profilesReaderSupabaseAdapter } from "@/src/contributions/infrastructure/supabase/profiles-reader.supabase"
import { supabaseRepositoryAdapter as fictionsRepo } from "@/src/fictions/infrastructure/supabase/fiction.repository.impl"
import { supabaseRepositoryAdapter as fictionInterestsRepo } from "@/src/fiction-interests/infrastructure/supabase/fiction-interests.repository.impl"
import { supabaseRepositoryAdapter as fictionExternalIdsRepo } from "@/src/fiction-external-ids/infrastructure/supabase/fiction-external-ids.repository.impl"
import { supabaseRepositoryAdapter as personsRepo } from "@/src/persons/infrastructure/supabase/person.repository.impl"
import { resolveOrCreatePerson } from "@/src/persons/application/resolve-or-create-person.usecase"
import { linkFictionPrimaryCreditUseCase } from "@/src/fictions/application/link-fiction-primary-credit.usecase"
import { FICTION_EXTERNAL_ID_PROVIDER } from "@/src/fiction-external-ids/domain/fiction-external-id.entity"
import { upsertFictionExternalIdUseCase } from "@/src/fiction-external-ids/application/upsert-fiction-external-id.usecase"
import type { FictionWithMedia } from "@/src/fictions/domain/fiction.entity"
import type { CreateFictionData } from "@/src/fictions/domain/fiction.schemas"
import {
  parseCreateFictionFormData,
  parseImdbIdFromFormData,
  parseUpdateFictionFormData,
} from "./fiction.form-parsers"
import { createFictionUseCase } from "@/src/fictions/application/create-fiction.usecase"
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
import { uploadEntityImage, validateImageFile } from "@/lib/asset-images/image-variant-service"
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

const CREATE_FICTION_CONTRIBUTION = {
  type: "create_fiction" as const,
  entityType: "fiction" as const,
}

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
    return { success: false, error: e instanceof Error ? e.message : "Failed to link credit" }
  }
}

async function recordCreateFictionContribution(
  fictionId: string,
  logContext: string,
): Promise<boolean | undefined> {
  const payload = { ...CREATE_FICTION_CONTRIBUTION, entityId: fictionId }
  try {
    const res = await createContributionAction(payload)
    if (!res.success) {
      console.error(`[${logContext}] createContributionAction failed`, {
        ...payload,
        error: res.error,
      })
      return undefined
    }
    return res.autoApproved
  } catch (err) {
    console.error(`[${logContext}] createContributionAction threw`, {
      ...payload,
      error: err instanceof Error ? err.message : String(err),
    })
    return undefined
  }
}

async function persistImdbExternalIdFromFormData(
  fictionId: string,
  imdbId: string,
): Promise<void> {
  await upsertFictionExternalIdUseCase(
    fictionId,
    FICTION_EXTERNAL_ID_PROVIDER.IMDB,
    imdbId,
    fictionExternalIdsRepo,
  )
}

function parseCreateFictionFormDataWithImdb(formData: FormData) {
  const parsed = parseCreateFictionFormData(formData)
  if (!parsed.success) return { success: false as const, error: zodErrorMessage(parsed.error) }
  const imdbParsed = parseImdbIdFromFormData(formData)
  if (!imdbParsed.success) return { success: false as const, error: zodErrorMessage(imdbParsed.error) }
  return { success: true as const, data: parsed.data, imdbId: imdbParsed.data }
}

async function createFictionWithImagesFromParsed(
  formData: FormData,
  data: CreateFictionData,
  imdbId: string | null,
  logTag: string,
): Promise<{ fiction: FictionWithMedia; contributionAutoApproved?: boolean } | null> {
  const fiction = await createFictionUseCase(data, fictionsRepo)
  if (!fiction) return null

  if (imdbId) {
    try {
      await persistImdbExternalIdFromFormData(fiction.id, imdbId)
    } catch {
      return null
    }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let contributionAutoApproved: boolean | undefined
  if (user) {
    contributionAutoApproved = await recordCreateFictionContribution(fiction.id, logTag)
  }

  const coverFile = formData.get("coverFile")
  const bannerFile = formData.get("bannerFile")

  if (coverFile instanceof File && coverFile.size > 0) {
    const validationError = validateImageFile(coverFile)
    if (!validationError) {
      await uploadEntityImage({
        entityType: "fiction",
        entityId: fiction.id,
        role: "cover",
        variants: ["sm", "lg"],
        file: coverFile,
        replace: true,
      })
    }
  }
  if (bannerFile instanceof File && bannerFile.size > 0) {
    const validationError = validateImageFile(bannerFile)
    if (!validationError) {
      await uploadEntityImage({
        entityType: "fiction",
        entityId: fiction.id,
        role: "banner",
        variants: ["lg"],
        file: bannerFile,
        replace: true,
      })
    }
  }

  revalidatePath("/admin")
  updateTag("fictions")

  const out: {
    fiction: FictionWithMedia
    contributionAutoApproved?: boolean
  } = { fiction }
  if (typeof contributionAutoApproved === "boolean") {
    out.contributionAutoApproved = contributionAutoApproved
  }
  return out
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

  const variants: ("sm" | "lg" | "xl")[] = role === "cover" ? ["sm", "lg"] : ["lg"]
  const result = await uploadEntityImage({ entityType: "fiction", entityId: fictionId, role, variants, file, replace: true })

  if (!result.success) return result

  revalidatePath(`/admin/fiction/${fictionId}`)
  updateTag("fictions")

  if (role === "cover") {
    return {
      success: true,
      coverImage: result.urls.sm,
      coverImageLarge: result.urls.lg,
    }
  }
  return { success: true, bannerImage: result.urls.lg }
}

export async function updateFictionAction(id: string, formData: FormData): Promise<UpdateFictionResult> {
  const parsed = parseUpdateFictionFormData(formData)
  if (!parsed.success) return { success: false, error: zodErrorMessage(parsed.error) }

  const fiction = await updateFictionUseCase(id, parsed.data, fictionsRepo)
  if (!fiction) return { success: false, error: "Failed to update fiction" }

  revalidatePath("/admin")
  revalidatePath(`/admin/fiction/${id}`)
  updateTag("fictions")
  return { success: true, fiction }
}

export async function createFictionAction(formData: FormData): Promise<CreateFictionResult> {
  const parsed = parseCreateFictionFormDataWithImdb(formData)
  if (!parsed.success) return { success: false, error: parsed.error }

  const fiction = await createFictionUseCase(parsed.data, fictionsRepo)
  if (!fiction) return { success: false, error: "Failed to create fiction" }

  if (parsed.imdbId) {
    try {
      await persistImdbExternalIdFromFormData(fiction.id, parsed.imdbId)
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : "Failed to save external id" }
    }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  let contributionAutoApproved: boolean | undefined
  if (user) {
    contributionAutoApproved = await recordCreateFictionContribution(fiction.id, "createFictionAction")
  }

  revalidatePath("/admin")
  updateTag("fictions")
  if (typeof contributionAutoApproved === "boolean") {
    return { success: true, fiction, contributionAutoApproved }
  }
  return { success: true, fiction }
}

export async function createFictionWithImagesAction(formData: FormData): Promise<CreateFictionResult> {
  const parsed = parseCreateFictionFormDataWithImdb(formData)
  if (!parsed.success) return { success: false, error: parsed.error }

  const out = await createFictionWithImagesFromParsed(
    formData,
    parsed.data,
    parsed.imdbId,
    "createFictionWithImagesAction",
  )
  if (!out) return { success: false, error: "Failed to create fiction" }

  if (typeof out.contributionAutoApproved === "boolean") {
    return { success: true, fiction: out.fiction, contributionAutoApproved: out.contributionAutoApproved }
  }
  return { success: true, fiction: out.fiction }
}

/** Contributor flow: server sets fiction status, created_by and active from session (client cannot override). */
export async function createContributorFictionWithImagesAction(formData: FormData): Promise<CreateFictionResult> {
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

  const out = await createFictionWithImagesFromParsed(
    fd,
    parsed.data,
    parsed.imdbId,
    "createContributorFictionWithImagesAction",
  )
  if (!out) return { success: false, error: "Failed to create fiction" }

  if (typeof out.contributionAutoApproved === "boolean") {
    return { success: true, fiction: out.fiction, contributionAutoApproved: out.contributionAutoApproved }
  }
  return { success: true, fiction: out.fiction }
}

export async function deleteFictionAction(id: string): Promise<DeleteFictionResult> {
  const ok = await deleteFictionUseCase(id, fictionsRepo)
  if (!ok) return { success: false, error: "Failed to delete fiction" }
  revalidatePath("/admin")
  revalidatePath(`/admin/fiction/${id}`)
  updateTag("fictions")
  return { success: true }
}

export async function setFictionActiveAction(id: string, active: boolean): Promise<SetFictionActiveResult> {
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
