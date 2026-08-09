import { FICTION_GENRES, type FictionGenre } from "@/lib/constants/fiction-genres"

/** Locales with auto-description copy. Other content languages fall back to English. */
type AutoDescriptionLocale = "en" | "es"

type FictionAutoDescriptionType = "movie" | "tv-series" | "book"

const GENRE_LABELS: Record<AutoDescriptionLocale, Record<FictionGenre, string>> = {
  en: {
    Romance: "Romance",
    Comedy: "Comedy",
    Drama: "Drama",
    Fantasy: "Fantasy",
    "Sci-Fi": "Sci-Fi",
    Thriller: "Thriller",
    Action: "Action",
    Horror: "Horror",
    Documentary: "Documentary",
    Animation: "Animation",
  },
  es: {
    Romance: "romance",
    Comedy: "comedia",
    Drama: "drama",
    Fantasy: "fantasía",
    "Sci-Fi": "ciencia ficción",
    Thriller: "thriller",
    Action: "acción",
    Horror: "terror",
    Documentary: "documental",
    Animation: "animación",
  },
}

const TYPE_LABELS: Record<AutoDescriptionLocale, Record<FictionAutoDescriptionType, string>> = {
  en: {
    movie: "movie",
    "tv-series": "TV series",
    book: "book",
  },
  es: {
    movie: "una película",
    "tv-series": "una serie de TV",
    book: "un libro",
  },
}

const FALLBACK: Record<AutoDescriptionLocale, string> = {
  en: "…",
  es: "…",
}

const CREDIT_PLACEHOLDER: Record<
  AutoDescriptionLocale,
  { director: string; author: string }
> = {
  en: { director: "the director", author: "the author" },
  es: { director: "el director", author: "el autor" },
}

function resolveAutoDescriptionLocale(contentLanguage: string): AutoDescriptionLocale {
  return contentLanguage === "es" ? "es" : "en"
}

function genreLabel(locale: AutoDescriptionLocale, genre: string): string {
  const trimmed = genre.trim()
  if (!trimmed) return FALLBACK[locale]
  if ((FICTION_GENRES as readonly string[]).includes(trimmed)) {
    return GENRE_LABELS[locale][trimmed as FictionGenre]
  }
  return trimmed
}

export function buildFictionContributeAutoDescription(
  id: {
    title: string
    year: number
    genre: string
    type: FictionAutoDescriptionType
    contentLanguage: string
  },
  creditName: string,
): string {
  const locale = resolveAutoDescriptionLocale(id.contentLanguage.trim())
  const title = id.title.trim() || FALLBACK[locale]
  const year = String(id.year)
  const genre = genreLabel(locale, id.genre)
  const type = TYPE_LABELS[locale][id.type]
  const credit = creditName.trim()

  if (id.type === "book") {
    const author = credit || CREDIT_PLACEHOLDER[locale].author
    if (locale === "es") {
      return `«${title}» (${year}) es ${type} de ${genre}. Autoría: ${author}.`
    }
    return `${title} (${year}) — ${genre} ${type}, by ${author}.`
  }

  const director = credit || CREDIT_PLACEHOLDER[locale].director
  if (locale === "es") {
    return `«${title}» (${year}) es ${type} de ${genre}. Dirección: ${director}.`
  }
  return `${title} (${year}) — ${genre} ${type}, directed by ${director}.`
}
