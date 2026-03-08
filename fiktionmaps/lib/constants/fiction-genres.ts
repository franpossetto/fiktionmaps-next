/** Shared list of fiction genres for admin creation/edit and onboarding. */
export const FICTION_GENRES = [
  "Romance",
  "Comedy",
  "Drama",
  "Fantasy",
  "Sci-Fi",
  "Thriller",
  "Action",
  "Horror",
  "Documentary",
  "Animation",
] as const

export type FictionGenre = (typeof FICTION_GENRES)[number]
