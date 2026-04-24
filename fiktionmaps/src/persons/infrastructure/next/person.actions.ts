"use server"

import { revalidatePath, updateTag } from "next/cache"
import { uuidSchema } from "@/lib/validation/primitives"
import { zodErrorMessage } from "@/lib/validation/http"
import { createPersonSchema, fictionPersonEntrySchema } from "@/src/persons/domain/person.schemas"
import { supabaseRepositoryAdapter as personsRepo } from "@/src/persons/infrastructure/supabase/person.repository.impl"
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
  if (!uuidSchema.safeParse(id).success) {
    return { success: false, error: "Invalid id" }
  }
  try {
    const ok = await personsRepo.delete(id)
    if (!ok) return { success: false, error: "Failed to delete person" }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Delete failed" }
  }
  revalidatePath("/admin")
  updateTag("persons")
  return { success: true }
}

export async function searchPersonsAction(query: string): Promise<SearchPersonsResult> {
  const q = query.trim()
  if (q.length < 1) return { success: true, persons: [] }
  try {
    const persons = await personsRepo.search(q)
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
    const person = await personsRepo.create(parsed.data)
    if (!person) return { success: false, error: "Failed to create person" }
    return { success: true, person }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Create failed" }
  }
}

export async function getFictionPersonsAction(fictionId: string): Promise<GetFictionPersonsResult> {
  if (!uuidSchema.safeParse(fictionId).success) {
    return { success: false, error: "Invalid fictionId" }
  }
  try {
    const persons = await personsRepo.getByFictionId(fictionId)
    return { success: true, persons }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to load persons" }
  }
}

export async function setFictionPersonsAction(
  fictionId: string,
  entries: { person_id: string; role: string; sort_order?: number }[]
): Promise<SetFictionPersonsResult> {
  if (!uuidSchema.safeParse(fictionId).success) {
    return { success: false, error: "Invalid fictionId" }
  }

  const parsed = z.array(fictionPersonEntrySchema).safeParse(entries)
  if (!parsed.success) return { success: false, error: zodErrorMessage(parsed.error) }

  try {
    await personsRepo.setForFiction(fictionId, parsed.data)
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to set persons" }
  }

  revalidatePath(`/admin/fiction/${fictionId}`)
  updateTag("fictions")
  return { success: true }
}
