"use server"

import { revalidatePath, updateTag } from "next/cache"
import { uuidSchema } from "@/lib/validation/primitives"
import { zodErrorMessage } from "@/lib/validation/http"
import { parseImageFocusFromFormData } from "@/lib/asset-images/image-focus"
import { uploadEntityImage, validateImageFile } from "@/lib/asset-images/image-variant-service"
import { PERSON_AVATAR_UPLOAD_VARIANTS } from "@/lib/asset-images/variant-sizes"
import { createPersonSchema, fictionPersonEntrySchema, updatePersonSchema } from "@/src/persons/domain/person.schemas"
import { supabaseRepositoryAdapter as personsRepo } from "@/src/persons/infrastructure/supabase/person.repository.impl"
import { deletePerson } from "@/src/persons/application/delete-person.usecase"
import { searchPersons } from "@/src/persons/application/search-persons.usecase"
import { listCreditCandidatesForContribute } from "@/src/persons/application/list-credit-candidates-for-contribute.usecase"
import { FICTION_PERSON_ROLES } from "@/src/persons/domain/person.entity"
import { createPerson } from "@/src/persons/application/create-person.usecase"
import { updatePerson } from "@/src/persons/application/update-person.usecase"
import { resolveOrCreatePerson } from "@/src/persons/application/resolve-or-create-person.usecase"
import { getFictionPersons } from "@/src/persons/application/get-fiction-persons.usecase"
import { setFictionPersons } from "@/src/persons/application/set-fiction-persons.usecase"
import { z } from "zod"
import type {
  SearchPersonsResult,
  ListDirectorCandidatesResult,
  CreatePersonResult,
  UpdatePersonResult,
  ResolveOrCreatePersonResult,
  DeletePersonResult,
  GetFictionPersonsResult,
  SetFictionPersonsResult,
  UploadPersonImageResult,
} from "./person.actions.types"

export type {
  SearchPersonsResult,
  ListDirectorCandidatesResult,
  CreatePersonResult,
  UpdatePersonResult,
  ResolveOrCreatePersonResult,
  DeletePersonResult,
  GetFictionPersonsResult,
  SetFictionPersonsResult,
  UploadPersonImageResult,
} from "./person.actions.types"

export async function deletePersonAction(id: string): Promise<DeletePersonResult> {
  const parsedId = uuidSchema.safeParse(id)
  if (!parsedId.success) {
    return { success: false, error: "Invalid id" }
  }
  try {
    const ok = await deletePerson({ id: parsedId.data }, personsRepo)
    if (!ok) return { success: false, error: "Failed to delete person" }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Delete failed" }
  }
  revalidatePath("/admin")
  updateTag("persons")
  return { success: true }
}

export async function searchPersonsAction(query: string): Promise<SearchPersonsResult> {
  const parsedQuery = z.string().trim().safeParse(query)
  if (!parsedQuery.success) return { success: false, error: zodErrorMessage(parsedQuery.error) }
  if (parsedQuery.data.length < 1) return { success: true, persons: [] }
  try {
    const persons = await searchPersons({ query: parsedQuery.data }, personsRepo)
    return { success: true, persons }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Search failed" }
  }
}

export async function listDirectorCandidatesAction(nameQuery: string): Promise<ListDirectorCandidatesResult> {
  return listCreditCandidatesAction("director", nameQuery)
}

export async function listCreditCandidatesAction(
  role: (typeof FICTION_PERSON_ROLES)[number],
  nameQuery: string,
): Promise<ListDirectorCandidatesResult> {
  const parsedRole = z.enum(FICTION_PERSON_ROLES).safeParse(role)
  if (!parsedRole.success) return { success: false, error: "Invalid role" }
  const parsed = z.string().safeParse(nameQuery ?? "")
  if (!parsed.success) return { success: false, error: zodErrorMessage(parsed.error) }
  try {
    const persons = await listCreditCandidatesForContribute(
      { role: parsedRole.data, nameQuery: parsed.data },
      personsRepo,
    )
    return { success: true, persons }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to load catalog" }
  }
}

export async function createPersonAction(
  data: { name: string; bio?: string; nationality?: string; birth_year?: number | null }
): Promise<CreatePersonResult> {
  const parsed = createPersonSchema.safeParse(data)
  if (!parsed.success) return { success: false, error: zodErrorMessage(parsed.error) }
  try {
    const person = await createPerson(parsed.data, personsRepo)
    if (!person) return { success: false, error: "Failed to create person" }
    revalidatePath("/admin")
    updateTag("persons")
    return { success: true, person }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Create failed" }
  }
}

export async function updatePersonAction(
  id: string,
  data: { name: string; bio?: string | null; nationality?: string | null; birth_year?: number | null }
): Promise<UpdatePersonResult> {
  const parsedId = uuidSchema.safeParse(id)
  if (!parsedId.success) {
    return { success: false, error: "Invalid id" }
  }
  const parsed = updatePersonSchema.safeParse(data)
  if (!parsed.success) return { success: false, error: zodErrorMessage(parsed.error) }
  try {
    const person = await updatePerson(parsedId.data, parsed.data, personsRepo)
    if (!person) return { success: false, error: "Failed to update person" }
    revalidatePath("/admin")
    updateTag("persons")
    return { success: true, person }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Update failed" }
  }
}

export async function uploadPersonImageAction(
  personId: string,
  formData: FormData,
): Promise<UploadPersonImageResult> {
  const parsedId = uuidSchema.safeParse(personId)
  if (!parsedId.success) return { success: false, error: "Invalid person id" }

  const file = formData.get("file")
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: "No file provided" }
  }
  const validationError = validateImageFile(file)
  if (validationError) return { success: false, error: validationError }

  const person = await personsRepo.getById(parsedId.data)
  if (!person) return { success: false, error: "Person not found" }

  const result = await uploadEntityImage({
    entityType: "person",
    entityId: parsedId.data,
    role: "avatar",
    variants: PERSON_AVATAR_UPLOAD_VARIANTS,
    file,
    replace: true,
    focus: parseImageFocusFromFormData(formData),
    codec: "avif",
  })
  if (!result.success) return result

  const photoUrl = result.urls.sm ?? result.urls.xs ?? result.urls.lg ?? null
  if (photoUrl) {
    await personsRepo.update(parsedId.data, { name: person.name, photo_url: photoUrl })
  }

  revalidatePath("/admin")
  updateTag("persons")
  return { success: true, photoUrl: photoUrl ?? "" }
}

export async function resolveOrCreatePersonAction(name: string): Promise<ResolveOrCreatePersonResult> {
  const parsed = z.string().trim().min(1).safeParse(name)
  if (!parsed.success) return { success: false, error: zodErrorMessage(parsed.error) }
  try {
    const person = await resolveOrCreatePerson(parsed.data, personsRepo)
    if (!person) return { success: false, error: "Failed to resolve person" }
    return { success: true, person }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to resolve person" }
  }
}

export async function getFictionPersonsAction(fictionId: string): Promise<GetFictionPersonsResult> {
  const parsedFictionId = uuidSchema.safeParse(fictionId)
  if (!parsedFictionId.success) {
    return { success: false, error: "Invalid fictionId" }
  }
  try {
    const persons = await getFictionPersons({ fictionId: parsedFictionId.data }, personsRepo)
    return { success: true, persons }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to load persons" }
  }
}

export async function setFictionPersonsAction(
  fictionId: string,
  entries: { person_id: string; role: string; sort_order?: number }[]
): Promise<SetFictionPersonsResult> {
  const parsedFictionId = uuidSchema.safeParse(fictionId)
  if (!parsedFictionId.success) {
    return { success: false, error: "Invalid fictionId" }
  }

  const parsedEntries = z.array(fictionPersonEntrySchema).safeParse(entries)
  if (!parsedEntries.success) return { success: false, error: zodErrorMessage(parsedEntries.error) }

  try {
    await setFictionPersons(
      { fictionId: parsedFictionId.data, entries: parsedEntries.data },
      personsRepo
    )
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to set persons" }
  }

  revalidatePath(`/admin/fiction/${fictionId}`)
  updateTag("fictions")
  updateTag("persons")
  return { success: true }
}
