export interface Person {
  id: string
  name: string
  bio: string | null
  photo_url: string | null
  birth_year: number | null
  nationality: string | null
  created_at: string
  updated_at: string
}

/** A person attached to a fiction with a specific role. */
export interface FictionPerson {
  id: string
  person_id: string
  name: string
  role: string
  sort_order: number
}

export const FICTION_PERSON_ROLES = [
  "director",
  "author",
  "actor",
  "creator",
  "producer",
  "screenwriter",
] as const

export type FictionPersonRole = (typeof FICTION_PERSON_ROLES)[number]
