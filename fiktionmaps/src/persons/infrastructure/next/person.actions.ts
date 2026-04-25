"use server"

import { revalidatePath, updateTag } from "next/cache"
import { uuidSchema } from "@/lib/validation/primitives"
import { zodErrorMessage } from "@/lib/validation/http"
import { createPersonSchema, fictionPersonEntrySchema } from "@/src/persons/domain/person.schemas"
import { supabaseRepositoryAdapter as personsRepo } from "@/src/persons/infrastructure/supabase/person.repository.impl"
import { deletePerson } from "@/src/persons/application/delete-person.usecase"
import { searchPersons } from "@/src/persons/application/search-persons.usecase"
import { createPerson } from "@/src/persons/application/create-person.usecase"
import { getFictionPersons } from "@/src/persons/application/get-fiction-persons.usecase"
import { setFictionPersons } from "@/src/persons/application/set-fiction-persons.usecase"
import { z } from "zod"
import type {
  SearchPersonsResult,
  CreatePersonResult,
  DeletePersonResult,
  GetFictionPersonsResult,
  SetFictionPersonsResult,
} from "./person.actions.types"

export type {
  SearchPersonsResult,
  CreatePersonResult,
  DeletePersonResult,
  GetFictionPersonsResult,
  SetFictionPersonsResult,
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

export async function createPersonAction(
  data: { name: string; bio?: string; nationality?: string; birth_year?: number | null }
): Promise<CreatePersonResult> {
  const parsed = createPersonSchema.safeParse(data)
  if (!parsed.success) return { success: false, error: zodErrorMessage(parsed.error) }
  try {
    const person = await createPerson(parsed.data, personsRepo)
    if (!person) return { success: false, error: "Failed to create person" }
    return { success: true, person }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Create failed" }
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
  return { success: true }
}
