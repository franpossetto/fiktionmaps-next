"use server"

import type { InterestCatalogItem } from "@/src/interests"
import { getInterestCatalogCached } from "./interest.queries"

export async function getInterestCatalogAction(locale: string): Promise<InterestCatalogItem[]> {
  return getInterestCatalogCached(locale)
}
