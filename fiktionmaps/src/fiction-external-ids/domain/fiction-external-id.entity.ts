export const FICTION_EXTERNAL_ID_PROVIDER = {
  IMDB: "imdb",
} as const

export type FictionExternalIdProvider =
  (typeof FICTION_EXTERNAL_ID_PROVIDER)[keyof typeof FICTION_EXTERNAL_ID_PROVIDER]

export interface FictionExternalId {
  id: string
  fictionId: string
  provider: FictionExternalIdProvider | string
  externalId: string
  createdAt: string
  updatedAt: string
}
