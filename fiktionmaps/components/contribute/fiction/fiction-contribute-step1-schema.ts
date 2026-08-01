import { z } from "zod"
import { isValidImdbTitleIdSegment } from "@/src/fiction-external-ids/domain/fiction-external-id.schemas"

/** Suggested word range in the contribute wizard (UI only; does not block submit). */
export const FICTION_CONTRIBUTE_DESCRIPTION_WORD_MIN = 40
export const FICTION_CONTRIBUTE_DESCRIPTION_WORD_MAX = 180

export function countFictionContributeDescriptionWords(text: string): number {
  const t = text.trim()
  if (!t) return 0
  return t.split(/\s+/).filter(Boolean).length
}

/**
 * Cover: portrait-leaning (taller than wide), not a hard 2:3 match.
 * Accepts roughly book/poster through slightly wide portrait.
 */
export const COVER_ASPECT_MIN_WIDTH_OVER_HEIGHT = 0.45
export const COVER_ASPECT_MAX_WIDTH_OVER_HEIGHT = 0.95

/** @deprecated Kept for callers; prefer min/max band. */
export const COVER_ASPECT_WIDTH_OVER_HEIGHT = 2 / 3
/** @deprecated Kept for callers; band replaces tolerance. */
export const COVER_ASPECT_RATIO_TOLERANCE = 0.35

export function isCoverAspectRatioOk(width: number, height: number): boolean {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return false
  const actual = width / height
  return (
    actual >= COVER_ASPECT_MIN_WIDTH_OVER_HEIGHT &&
    actual <= COVER_ASPECT_MAX_WIDTH_OVER_HEIGHT
  )
}

/** Lado corto mínimo (px) para que la portada siga siendo legible en miniatura. */
export const COVER_READABLE_MIN_SHORT_EDGE_PX = 400

export function isCoverReadableResolutionOk(width: number, height: number): boolean {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return false
  return Math.min(width, height) >= COVER_READABLE_MIN_SHORT_EDGE_PX
}

/** Banner: landscape (wider than tall). */
export const BANNER_MIN_WIDTH_OVER_HEIGHT = 1.2

export function isBannerAspectRatioOk(width: number, height: number): boolean {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return false
  return width / height >= BANNER_MIN_WIDTH_OVER_HEIGHT
}

/**
 * Same order/values as `@/lib/constants/fiction-genres`.
 * Declared here (not imported) so client bundle eval order cannot break `z.enum`.
 */
const FICTION_GENRE_VALUES = [
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

const FICTION_TYPE_VALUES = ["movie", "book", "tv-series"] as const

const FICTION_LANGUAGE_CODE_VALUES = [
  "en", "es", "de", "fr", "it", "pt", "ja", "ko", "zh", "ar", "ru",
] as const

const MAX_IMAGE_BYTES = 10 * 1024 * 1024
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"]

export const BANNER_READABLE_MIN_SHORT_EDGE_PX = 360

export function isBannerReadableResolutionOk(width: number, height: number): boolean {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return false
  return Math.min(width, height) >= BANNER_READABLE_MIN_SHORT_EDGE_PX
}

export type FictionContributeValidationMessages = {
  titleRequired: string
  yearRequired: string
  yearInvalid: string
  genreRequired: string
  descriptionRequired: string
  imdbIdInvalid: string
  coverRequired: string
  imageFormatInvalid: string
  imageTooLarge: string
  directorRequired: string
  originalLanguageRequired: string
  contentLanguageRequired: string
}

function validateContributedImageFile(file: File, m: Pick<FictionContributeValidationMessages, "imageFormatInvalid" | "imageTooLarge">): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return m.imageFormatInvalid
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return m.imageTooLarge
  }
  return null
}

function imdbIdSuperRefine(
  data: { imdbId?: string | undefined },
  ctx: z.RefinementCtx,
  m: Pick<FictionContributeValidationMessages, "imdbIdInvalid">,
) {
  const s = (data.imdbId ?? "").trim()
  if (!s) return
  if (!isValidImdbTitleIdSegment(s)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: m.imdbIdInvalid,
      path: ["imdbId"],
    })
  }
}

/** Schemas del wizard con mensajes localizados. */
export function createFictionContributeSchemas(m: FictionContributeValidationMessages) {
  const basicsCore = z
    .object({
      title: z.string().trim().min(1, m.titleRequired),
      type: z.enum(FICTION_TYPE_VALUES),
      year: z.coerce
        .number({ invalid_type_error: m.yearRequired })
        .int()
        .min(1900, m.yearInvalid)
        .refine((y) => y <= new Date().getFullYear(), m.yearInvalid),
      genre: z.enum(FICTION_GENRE_VALUES, { message: m.genreRequired }),
      imdbId: z.string().optional(),
      originalLanguage: z.enum(FICTION_LANGUAGE_CODE_VALUES, { message: m.originalLanguageRequired }),
      contentLanguage: z.enum(FICTION_LANGUAGE_CODE_VALUES, { message: m.contentLanguageRequired }),
    })
    .superRefine((data, ctx) => imdbIdSuperRefine(data, ctx, m))

  const basics = z
    .object({
      title: z.string().trim().min(1, m.titleRequired),
      type: z.enum(FICTION_TYPE_VALUES),
      year: z.coerce
        .number({ invalid_type_error: m.yearRequired })
        .int()
        .min(1900, m.yearInvalid)
        .refine((y) => y <= new Date().getFullYear(), m.yearInvalid),
      genre: z.enum(FICTION_GENRE_VALUES, { message: m.genreRequired }),
      description: z.string().trim().min(1, m.descriptionRequired),
      imdbId: z.string().optional(),
      originalLanguage: z.enum(FICTION_LANGUAGE_CODE_VALUES, { message: m.originalLanguageRequired }),
      contentLanguage: z.enum(FICTION_LANGUAGE_CODE_VALUES, { message: m.contentLanguageRequired }),
    })
    .superRefine((data, ctx) => imdbIdSuperRefine(data, ctx, m))

  const descriptionStep = z.object({
    description: z.string().trim().min(1, m.descriptionRequired),
  })

  const cover = z
    .object({
      coverFile: z
        .custom<File | null>((f) => f == null || f instanceof File)
        .refine((f): f is File => f instanceof File && f.size > 0, {
          message: m.coverRequired,
        }),
    })
    .superRefine((data, ctx) => {
      if (data.coverFile instanceof File) {
        const err = validateContributedImageFile(data.coverFile, m)
        if (err) ctx.addIssue({ code: z.ZodIssueCode.custom, message: err, path: ["coverFile"] })
      }
    })

  const banner = z
    .object({
      bannerFile: z.custom<File | null | undefined>((f) => f == null || f instanceof File).optional(),
    })
    .superRefine((data, ctx) => {
      if (data.bannerFile instanceof File && data.bannerFile.size > 0) {
        const err = validateContributedImageFile(data.bannerFile, m)
        if (err) ctx.addIssue({ code: z.ZodIssueCode.custom, message: err, path: ["bannerFile"] })
      }
    })

  const director = z.object({
    director: z.string().trim().min(1, m.directorRequired),
  })

  return { basicsCore, basics, descriptionStep, cover, banner, director }
}

/** Estado del formulario (identidad); el director vive en el paso Equipo. */
export type FictionContributeIdentityDraft = {
  title: string
  type: "movie" | "book" | "tv-series"
  year: number
  genre: string
  description: string
  /** Segmento tt… (solo película/serie). */
  imdbId: string
  coverFile: File | null
  originalLanguage: string
  contentLanguage: string
  bannerFile?: File | null
}
