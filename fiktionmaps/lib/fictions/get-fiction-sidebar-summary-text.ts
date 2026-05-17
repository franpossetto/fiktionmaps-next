import { getTranslations } from "next-intl/server"
import type { FictionWithMedia } from "@/src/fictions/domain/fiction.entity"

/** Short paragraph shown beside the fiction cover on slug detail rails (fiction + place-under-fiction). */
export async function getFictionSidebarSummaryText(fiction: FictionWithMedia, locale: string): Promise<string> {
  const t = await getTranslations({ locale, namespace: "Fictions" })
  const yearSuffix = fiction.year ? ` (${fiction.year})` : ""
  const shortIntroKey = (() => {
    if (fiction.type === "tv-series") {
      return fiction.author ? "shortIntroSeriesWithAuthor" : "shortIntroSeriesNoAuthor"
    }
    if (fiction.type === "book") {
      return fiction.author ? "shortIntroBookWithAuthor" : "shortIntroBookNoAuthor"
    }
    return fiction.author ? "shortIntroMovieWithAuthor" : "shortIntroMovieNoAuthor"
  })()
  return t(shortIntroKey, {
    title: fiction.title,
    yearSuffix,
    author: fiction.author ?? "",
  })
}
