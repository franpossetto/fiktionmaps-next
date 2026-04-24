import type { Person, FictionPerson } from "@/src/persons/domain/person.entity"

export type SearchPersonsResult =
  | { success: true; persons: Person[] }
  | { success: false; error: string }

export type CreatePersonResult =
  | { success: true; person: Person }
  | { success: false; error: string }

export type DeletePersonResult =
  | { success: true }
  | { success: false; error: string }

export type GetFictionPersonsResult =
  | { success: true; persons: FictionPerson[] }
  | { success: false; error: string }

export type SetFictionPersonsResult =
  | { success: true }
  | { success: false; error: string }
