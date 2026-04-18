export interface Interest {
  id: string
  key: string
  active: boolean
}

export interface InterestTranslation {
  interestId: string
  locale: string
  label: string
}

/** Read model: Interest joined with its translation for a given locale. */
export interface InterestCatalogItem {
  id: string
  key: string
  label: string
}
