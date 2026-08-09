"use client"

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { useRouter, Link } from "@/i18n/navigation"
import { AnimatePresence, motion } from "framer-motion"
import { Check, ImagePlus, Loader2, X } from "lucide-react"
import { z } from "zod"
import { cn } from "@/lib/utils"
import { ImageFocusPicker } from "@/components/ui/image-focus-picker"
import { DEFAULT_IMAGE_FOCUS } from "@/lib/asset-images/image-focus"
import { FICTION_GENRES } from "@/lib/constants/fiction-genres"
import { FICTION_LANGUAGE_CODES, FICTION_LANGUAGE_LABELS } from "@/lib/constants/fiction-languages"
import { buildFictionContributeAutoDescription } from "@/lib/contribute/fiction-auto-description"
import type { InterestCatalogItem } from "@/src/interests"
import type { Fiction } from "@/src/fictions/domain/fiction.entity"
import {
  countFictionContributeDescriptionWords,
  FICTION_CONTRIBUTE_DESCRIPTION_WORD_MAX,
  FICTION_CONTRIBUTE_DESCRIPTION_WORD_MIN,
} from "@/components/contribute/fiction/fiction-contribute-step1-schema"
import { generateSlug } from "@/src/fictions/domain/fiction-slug"
import {
  checkFictionDuplicateForContributeAction,
  createContributorFictionWithImagesAction,
  linkFictionPrimaryCreditAction,
  setFictionInterestsAction,
} from "@/src/fictions/infrastructure/next/fiction.actions"
import { getFictionPrimaryCreditRole } from "@/src/fictions/domain/fiction-primary-credit"
import type { FictionDuplicateSummaryForContribute } from "@/src/fictions/infrastructure/next/fiction.actions.types"
import { listCreditCandidatesAction } from "@/src/persons/infrastructure/next/person.actions"
import type { Person } from "@/src/persons"
import { Button } from "@/components/ui/button"
import { FictionContributeLayout } from "@/components/contribute/fiction/fiction-contribute-layout"
import { ContributeFieldWrapper } from "@/components/contribute/contribute-field-wrapper"
import { ContributeStepHeader } from "@/components/contribute/contribute-step-header"
import { ContributionWizardShell } from "@/components/contribute/contribution-wizard-shell"
import { FictionContributeCategoryAside } from "@/components/contribute/fiction/fiction-contribute-category-aside"
import {
  FictionContributeStepsAside,
  type FictionContributeFormStep,
  type FictionContributeStepsNavTarget,
} from "@/components/contribute/fiction/fiction-contribute-steps-aside"
import {
  FictionContributeCategoryPicker,
  type ContributeCategoryId,
} from "@/components/contribute/fiction/fiction-contribute-category-picker"
import {
  FictionContributeCriteriaAside,
  type ContributeBasicsCriterionKey,
} from "@/components/contribute/fiction/fiction-contribute-criteria-aside"
import { FictionContributePublicPreview } from "@/components/contribute/fiction/fiction-contribute-public-preview"
import { FictionContributeFppRewardCompactStrip } from "@/components/contribute/fiction/fiction-contribute-fpp-reward-card"
import {
  FictionContributeDoneView,
  type FictionContributeDoneVariant,
} from "@/components/contribute/fiction/fiction-contribute-done-view"
import {
  createFictionContributeSchemas,
  isBannerAspectRatioOk,
  isBannerReadableResolutionOk,
  isCoverAspectRatioOk,
  isCoverReadableResolutionOk,
  type FictionContributeIdentityDraft,
} from "./fiction-contribute-step1-schema"

/** Controles compactos (~44px alto, `text-sm`) como el wizard de referencia. */
const INPUT_ROW =
  "h-11 w-full shrink-0 rounded-xl border border-border bg-card px-4 text-sm outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground focus:ring-2 focus:ring-foreground/20"
const INPUT_AREA =
  "min-h-[100px] w-full resize-y rounded-xl border border-border bg-card px-4 py-2.5 text-sm outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground focus:ring-2 focus:ring-foreground/20"
/** Altura y tipografía alineadas a INPUT_ROW; prefijo URL fijo + solo tt… editable. */
const INPUT_ROW_COMBO = {
  shell:
    "flex h-11 w-full min-w-0 overflow-hidden rounded-xl border border-border bg-card text-sm outline-none transition-[border-color,box-shadow] focus-within:ring-2 focus-within:ring-foreground/20",
  prefix:
    "flex max-w-[min(100%,12.5rem)] shrink-0 items-center border-r border-border bg-muted/25 px-2.5 text-xs text-muted-foreground sm:max-w-[55%] sm:px-3 sm:text-sm",
  input:
    "min-h-11 min-w-0 flex-1 border-0 bg-transparent px-3 outline-none placeholder:text-muted-foreground focus:ring-0",
} as const

const IMDB_TITLE_URL_PREFIX = "https://www.imdb.com/title/"

const stepVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
} as const

const TOTAL_STEPS = 7

/** Puntos del footer: índice 0 = elegir tipo; 1–7 = pasos del formulario (identidad, portada, banner, …). */
const WIZARD_DOT_TRACK_TOTAL = 8

function zodIssuesToRecord(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {}
  for (const issue of err.issues) {
    const path = issue.path.join(".") || "_root"
    if (!out[path]) out[path] = issue.message
  }
  return out
}

function loadImageDimensionsFromFile(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = document.createElement("img")
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error("image-load"))
    }
    img.src = url
  })
}

function emptyIdentity(locale: string): FictionContributeIdentityDraft {
  return {
    title: "",
    type: "movie",
    year: new Date().getFullYear(),
    genre: "",
    description: "",
    imdbId: "",
    coverFile: null,
    bannerFile: undefined,
    originalLanguage: "",
    contentLanguage: locale,
  }
}

function fictionTypeToCategoryPick(typ: Fiction["type"]): ContributeCategoryId {
  return typ === "tv-series" ? "tv" : typ
}

export interface FictionContributeWizardProps {
  initialInterests: InterestCatalogItem[]
}

export function FictionContributeWizard({ initialInterests }: FictionContributeWizardProps) {
  const router = useRouter()
  const locale = useLocale()
  const t = useTranslations("Contribute")
  const tf = useTranslations("Contribute.fiction")
  const tVal = useTranslations("Contribute.validation")
  const baseId = useId()

  const [step, setStep] = useState<FictionContributeFormStep>(1)
  const [identity, setIdentity] = useState<FictionContributeIdentityDraft>(() => emptyIdentity(locale))
  const [director, setDirector] = useState("")
  const [directorPersonId, setDirectorPersonId] = useState<string | null>(null)
  const [directorCatalog, setDirectorCatalog] = useState<Person[]>([])
  const [directorCatalogLoading, setDirectorCatalogLoading] = useState(false)
  const [directorCatalogFilter, setDirectorCatalogFilter] = useState("")
  const [interestIds, setInterestIds] = useState<string[]>([])
  const [activeCriteriaBasicsField, setActiveCriteriaBasicsField] = useState<ContributeBasicsCriterionKey | null>(
    null,
  )
  const [flowPhase, setFlowPhase] = useState<"category" | "form">("category")
  const [pickedCategory, setPickedCategory] = useState<ContributeCategoryId | null>(null)
  const [categoryError, setCategoryError] = useState<string | null>(null)

  const [step1Errors, setStep1Errors] = useState<Record<string, string>>({})
  const [step3Errors, setStep3Errors] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [doneState, setDoneState] = useState<{
    variant: FictionContributeDoneVariant
    title: string
    coverSrc: string | null
    fictionHref: string
    note?: string
  } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [duplicateCheckLoading, setDuplicateCheckLoading] = useState(false)
  const [duplicateCheckError, setDuplicateCheckError] = useState<string | null>(null)
  const [duplicateMatch, setDuplicateMatch] = useState<FictionDuplicateSummaryForContribute | null>(null)
  const [duplicateCheckToken, setDuplicateCheckToken] = useState(0)

  /** IMDb aplica a película y serie; no a libro (ni música en el modelo actual). */
  const showImdbField = identity.type === "movie" || identity.type === "tv-series"

  const contributeSchemas = useMemo(
    () =>
      createFictionContributeSchemas({
        titleRequired: tVal("titleRequired"),
        yearRequired: tVal("yearRequired"),
        yearInvalid: tVal("yearInvalid"),
        genreRequired: tVal("genreRequired"),
        descriptionRequired: tVal("descriptionRequired"),
        imdbIdInvalid: tVal("imdbIdInvalid"),
        coverRequired: tVal("coverRequired"),
        imageFormatInvalid: tVal("imageFormatInvalid"),
        imageTooLarge: tVal("imageTooLarge"),
        directorRequired:
          identity.type === "book" ? tVal("authorRequired") : tVal("directorRequired"),
        originalLanguageRequired: tVal("originalLanguageRequired"),
        contentLanguageRequired: tVal("contentLanguageRequired"),
      }),
    [identity.type, locale, tVal],
  )

  const isBookFiction = identity.type === "book"
  const primaryCreditRole = getFictionPrimaryCreditRole(identity.type)
  const tfCredit = useCallback(
    (directorKey: string, authorKey: string) => tf(isBookFiction ? authorKey : directorKey),
    [isBookFiction, tf],
  )

  const coverInputRef = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)

  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null)
  const [bannerPreviewUrl, setBannerPreviewUrl] = useState<string | null>(null)
  const [coverImageDims, setCoverImageDims] = useState<{ width: number; height: number } | null>(null)
  const [coverInspecting, setCoverInspecting] = useState(false)
  const [bannerImageDims, setBannerImageDims] = useState<{ width: number; height: number } | null>(null)
  const [bannerInspecting, setBannerInspecting] = useState(false)
  const [coverFocus, setCoverFocus] = useState(DEFAULT_IMAGE_FOCUS)
  const [bannerFocus, setBannerFocus] = useState(DEFAULT_IMAGE_FOCUS)

  const coverCriterionChecks = useMemo((): readonly [boolean, boolean, boolean, boolean] | undefined => {
    if (step !== 2) return undefined
    const file = identity.coverFile
    const hasFile = Boolean(file && file instanceof File && file.size > 0)
    const dims = coverImageDims
    const aspectOk = Boolean(dims && isCoverAspectRatioOk(dims.width, dims.height))
    const readableOk = Boolean(dims && isCoverReadableResolutionOk(dims.width, dims.height))

    return [
      hasFile,
      hasFile && aspectOk,
      hasFile,
      hasFile && readableOk,
    ]
  }, [step, identity.coverFile, coverImageDims])

  const bannerCriterionChecks = useMemo((): readonly [boolean, boolean, boolean, boolean] | undefined => {
    if (step !== 3) return undefined
    const file = identity.bannerFile
    const hasFile = Boolean(file && file instanceof File && file.size > 0)
    if (!hasFile) return undefined
    const dims = bannerImageDims
    const aspectOk = Boolean(dims && isBannerAspectRatioOk(dims.width, dims.height))
    const readableOk = Boolean(dims && isBannerReadableResolutionOk(dims.width, dims.height))
    return [
      hasFile,
      hasFile,
      hasFile && aspectOk,
      hasFile && readableOk,
    ]
  }, [step, identity.bannerFile, bannerImageDims])

  const clearContributedCover = useCallback(() => {
    setCoverInspecting(false)
    setIdentity((s) => ({ ...s, coverFile: null }))
    setCoverImageDims(null)
    setCoverFocus(DEFAULT_IMAGE_FOCUS)
    setStep1Errors((prev) => {
      const next = { ...prev }
      delete next.coverFile
      return next
    })
    if (coverInputRef.current) coverInputRef.current.value = ""
  }, [])

  const clearContributedBanner = useCallback(() => {
    setBannerInspecting(false)
    setIdentity((s) => ({ ...s, bannerFile: undefined }))
    setBannerImageDims(null)
    setBannerFocus(DEFAULT_IMAGE_FOCUS)
    setStep1Errors((prev) => {
      const next = { ...prev }
      delete next.bannerFile
      return next
    })
    if (bannerInputRef.current) bannerInputRef.current.value = ""
  }, [])

  const basicsCriterionBlurTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const focusBasicsCriterion = useCallback((field: ContributeBasicsCriterionKey) => {
    if (basicsCriterionBlurTimer.current) {
      clearTimeout(basicsCriterionBlurTimer.current)
      basicsCriterionBlurTimer.current = null
    }
    setActiveCriteriaBasicsField(field)
  }, [])

  const blurBasicsCriterion = useCallback(() => {
    if (basicsCriterionBlurTimer.current) clearTimeout(basicsCriterionBlurTimer.current)
    basicsCriterionBlurTimer.current = setTimeout(() => {
      basicsCriterionBlurTimer.current = null
      const el = document.activeElement
      if (!el || !(el instanceof Element) || !el.closest("[data-contribute-basics-field]")) {
        setActiveCriteriaBasicsField(null)
      }
    }, 0)
  }, [])

  /** Evita que `fictionStepNavBlocked` quede en true con mensajes obsoletos tras corregir el campo. */
  const clearStep1BasicsFieldError = useCallback((field: ContributeBasicsCriterionKey | "type" | "originalLanguage" | "contentLanguage") => {
    setStep1Errors((prev) => {
      if (!prev[field]) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
  }, [])

  useEffect(() => {
    return () => {
      if (basicsCriterionBlurTimer.current) clearTimeout(basicsCriterionBlurTimer.current)
    }
  }, [])

  useEffect(() => {
    const f = identity.coverFile
    if (!f || !(f instanceof File) || f.size === 0) {
      if (coverPreviewUrl) URL.revokeObjectURL(coverPreviewUrl)
      setCoverPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(f)
    setCoverPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [identity.coverFile])

  useEffect(() => {
    const f = identity.coverFile
    if (!f || !(f instanceof File) || f.size === 0) {
      setCoverImageDims(null)
    }
  }, [identity.coverFile])

  useEffect(() => {
    const f = identity.bannerFile
    if (!f || !(f instanceof File) || f.size === 0) {
      setBannerImageDims(null)
    }
  }, [identity.bannerFile])

  useEffect(() => {
    const f = identity.bannerFile
    if (!f || !(f instanceof File) || f.size === 0) {
      if (bannerPreviewUrl) URL.revokeObjectURL(bannerPreviewUrl)
      setBannerPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(f)
    setBannerPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [identity.bannerFile])

  useEffect(() => {
    setActiveCriteriaBasicsField(null)
  }, [step])

  useEffect(() => {
    if (!showImdbField && identity.imdbId) {
      setIdentity((s) => ({ ...s, imdbId: "" }))
    }
  }, [showImdbField, identity.imdbId])

  useEffect(() => {
    if (!showImdbField) {
      setStep1Errors((e) => {
        if (!e.imdbId) return e
        const next = { ...e }
        delete next.imdbId
        return next
      })
    }
  }, [showImdbField])

  useEffect(() => {
    if (step !== 1) return
    if (!showImdbField || !identity.imdbId.trim()) {
      setDuplicateCheckLoading(false)
      setDuplicateCheckError(null)
      setDuplicateMatch(null)
      return
    }
    let cancelled = false
    setDuplicateCheckLoading(true)
    setDuplicateCheckError(null)
    setDuplicateMatch(null)
    void checkFictionDuplicateForContributeAction({
      title: identity.title.trim(),
      year: identity.year,
      type: identity.type,
      imdbId: identity.imdbId.trim(),
    }).then((res) => {
      if (cancelled) return
      setDuplicateCheckLoading(false)
      if (!res.success) {
        setDuplicateCheckError(res.error)
        return
      }
      setDuplicateMatch(res.duplicate)
    })
    return () => {
      cancelled = true
    }
  }, [
    duplicateCheckToken,
    identity.imdbId,
    identity.title,
    identity.type,
    identity.year,
    showImdbField,
    step,
  ])

  useEffect(() => {
    if (step !== 5) return
    let cancelled = false
    setDirectorCatalogLoading(true)
    void listCreditCandidatesAction(primaryCreditRole, "").then((res) => {
      if (cancelled) return
      setDirectorCatalog(res.success ? res.persons : [])
      setDirectorCatalogLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [primaryCreditRole, step])

  const filteredDirectorCatalog = useMemo(() => {
    const f = directorCatalogFilter.trim().toLowerCase()
    if (!f) return directorCatalog
    return directorCatalog.filter((p) => p.name.toLowerCase().includes(f))
  }, [directorCatalog, directorCatalogFilter])

  const descriptionWordCount = useMemo(
    () => countFictionContributeDescriptionWords(identity.description),
    [identity.description],
  )

  const descriptionWordCountInSuggestedRange = useMemo(
    () =>
      descriptionWordCount >= FICTION_CONTRIBUTE_DESCRIPTION_WORD_MIN &&
      descriptionWordCount <= FICTION_CONTRIBUTE_DESCRIPTION_WORD_MAX,
    [descriptionWordCount],
  )

  const validateIdentityBasics = useCallback(() => {
    const parsed = contributeSchemas.basicsCore.safeParse({
      title: identity.title,
      type: identity.type,
      year: identity.year,
      genre: identity.genre,
      imdbId: showImdbField ? identity.imdbId : "",
      originalLanguage: identity.originalLanguage,
      contentLanguage: identity.contentLanguage,
    })
    if (!parsed.success) {
      setStep1Errors((e) => ({ ...e, ...zodIssuesToRecord(parsed.error) }))
      return false
    }
    setStep1Errors((e) => {
      const next = { ...e }
      for (const k of ["title", "type", "year", "genre", "imdbId", "originalLanguage", "contentLanguage"]) delete next[k]
      return next
    })
    return true
  }, [contributeSchemas.basicsCore, identity.contentLanguage, identity.genre, identity.imdbId, identity.originalLanguage, identity.title, identity.type, identity.year, showImdbField])

  const validateDescriptionStep = useCallback(() => {
    const parsed = contributeSchemas.descriptionStep.safeParse({
      description: identity.description,
    })
    if (!parsed.success) {
      setStep1Errors((e) => ({ ...e, ...zodIssuesToRecord(parsed.error) }))
      return false
    }
    setStep1Errors((e) => {
      const next = { ...e }
      delete next.description
      return next
    })
    return true
  }, [contributeSchemas.descriptionStep, identity.description])

  const validateIdentityCover = useCallback(() => {
    const parsed = contributeSchemas.cover.safeParse({
      coverFile: identity.coverFile,
    })
    if (!parsed.success) {
      setStep1Errors((e) => ({ ...e, ...zodIssuesToRecord(parsed.error) }))
      return false
    }
    if (
      !coverImageDims ||
      !isCoverAspectRatioOk(coverImageDims.width, coverImageDims.height)
    ) {
      setStep1Errors((e) => ({ ...e, coverFile: tVal("coverAspectInvalid") }))
      return false
    }
    if (!isCoverReadableResolutionOk(coverImageDims.width, coverImageDims.height)) {
      setStep1Errors((e) => ({ ...e, coverFile: tVal("imageResolutionLow") }))
      return false
    }
    setStep1Errors((e) => {
      const next = { ...e }
      delete next.coverFile
      return next
    })
    return true
  }, [contributeSchemas.cover, coverImageDims, identity.coverFile, tVal])

  const validateIdentityBanner = useCallback(() => {
    const f = identity.bannerFile
    const hasFile = f instanceof File && f.size > 0
    if (!hasFile) {
      setStep1Errors((e) => {
        const next = { ...e }
        delete next.bannerFile
        return next
      })
      return true
    }
    const parsed = contributeSchemas.banner.safeParse({
      bannerFile: identity.bannerFile,
    })
    if (!parsed.success) {
      setStep1Errors((e) => ({ ...e, ...zodIssuesToRecord(parsed.error) }))
      return false
    }
    if (
      !bannerImageDims ||
      !isBannerAspectRatioOk(bannerImageDims.width, bannerImageDims.height)
    ) {
      setStep1Errors((e) => ({ ...e, bannerFile: tVal("bannerAspectInvalid") }))
      return false
    }
    if (!isBannerReadableResolutionOk(bannerImageDims.width, bannerImageDims.height)) {
      setStep1Errors((e) => ({ ...e, bannerFile: tVal("imageResolutionLow") }))
      return false
    }
    setStep1Errors((e) => {
      const next = { ...e }
      delete next.bannerFile
      return next
    })
    return true
  }, [bannerImageDims, contributeSchemas.banner, identity.bannerFile, tVal])

  const validateDirectorStep = useCallback(() => {
    const parsed = contributeSchemas.director.safeParse({ director })
    if (!parsed.success) {
      setStep3Errors(zodIssuesToRecord(parsed.error))
      return false
    }
    setStep3Errors({})
    return true
  }, [contributeSchemas.director, director])

  const validateAllForSubmit = useCallback(() => {
    const basicsCore = contributeSchemas.basicsCore.safeParse({
      title: identity.title,
      type: identity.type,
      year: identity.year,
      genre: identity.genre,
      imdbId: showImdbField ? identity.imdbId : "",
      originalLanguage: identity.originalLanguage,
      contentLanguage: identity.contentLanguage,
    })
    const description = contributeSchemas.descriptionStep.safeParse({
      description: identity.description,
    })
    const cover = contributeSchemas.cover.safeParse({
      coverFile: identity.coverFile,
    })
    const banner = contributeSchemas.banner.safeParse({
      bannerFile: identity.bannerFile,
    })
    const dir = contributeSchemas.director.safeParse({ director })

    const merged: Record<string, string> = {}
    if (!basicsCore.success) Object.assign(merged, zodIssuesToRecord(basicsCore.error))
    if (!description.success) Object.assign(merged, zodIssuesToRecord(description.error))
    if (!cover.success) Object.assign(merged, zodIssuesToRecord(cover.error))
    if (!banner.success) Object.assign(merged, zodIssuesToRecord(banner.error))

    let coverStepOk = cover.success
    if (cover.success) {
      if (!coverImageDims || !isCoverAspectRatioOk(coverImageDims.width, coverImageDims.height)) {
        merged.coverFile = tVal("coverAspectInvalid")
        coverStepOk = false
      } else if (!isCoverReadableResolutionOk(coverImageDims.width, coverImageDims.height)) {
        merged.coverFile = tVal("imageResolutionLow")
        coverStepOk = false
      }
    }

    let bannerStepOk = banner.success
    if (banner.success) {
      const bf = identity.bannerFile
      const hasBanner = bf instanceof File && bf.size > 0
      if (hasBanner) {
        if (!bannerImageDims || !isBannerAspectRatioOk(bannerImageDims.width, bannerImageDims.height)) {
          merged.bannerFile = tVal("bannerAspectInvalid")
          bannerStepOk = false
        } else if (!isBannerReadableResolutionOk(bannerImageDims.width, bannerImageDims.height)) {
          merged.bannerFile = tVal("imageResolutionLow")
          bannerStepOk = false
        }
      }
    }

    if (!basicsCore.success) {
      setStep1Errors(merged)
      setStep(1)
      return false
    }
    if (!description.success) {
      setStep1Errors(merged)
      setStep(6)
      return false
    }
    if (!coverStepOk) {
      setStep1Errors(merged)
      setStep(2)
      return false
    }
    if (!bannerStepOk) {
      setStep1Errors(merged)
      setStep(3)
      return false
    }
    setStep1Errors({})
    if (!dir.success) {
      setStep3Errors(zodIssuesToRecord(dir.error))
      setStep(5)
      return false
    }
    setStep3Errors({})
    return true
  }, [bannerImageDims, contributeSchemas, coverImageDims, director, identity, showImdbField, tVal])

  const goNext = useCallback(() => {
    setSubmitError(null)
    if (step === 1) {
      if (!validateIdentityBasics()) return
      if (showImdbField && identity.imdbId.trim()) {
        if (duplicateCheckLoading || duplicateCheckError || duplicateMatch) return
      }
      setStep(2)
      return
    }
    if (step === 2) {
      if (!validateIdentityCover()) return
      setStep(3)
      return
    }
    if (step === 3) {
      if (!validateIdentityBanner()) return
      setStep(4)
      return
    }
    if (step === 4) {
      setStep(5)
      return
    }
    if (step === 5) {
      if (!validateDirectorStep()) return
      setIdentity((s) => ({
        ...s,
        description: s.description.trim() || buildFictionContributeAutoDescription(s, director),
      }))
      setStep(6)
      return
    }
    if (step === 6) {
      if (!validateDescriptionStep()) return
      setStep(7)
      return
    }
  }, [
    director,
    duplicateCheckError,
    duplicateCheckLoading,
    duplicateMatch,
    identity,
    showImdbField,
    step,
    validateDescriptionStep,
    validateDirectorStep,
    validateIdentityBasics,
    validateIdentityBanner,
    validateIdentityCover,
  ])

  const handleCategoryContinue = useCallback(() => {
    if (!pickedCategory) {
      setCategoryError(t("categoryPicker.chooseTypeError"))
      return
    }
    if (pickedCategory === "music") {
      setCategoryError(t("categoryPicker.musicSoonError"))
      return
    }
    setCategoryError(null)
    const nextType: Fiction["type"] = pickedCategory === "tv" ? "tv-series" : pickedCategory
    setIdentity((s) => ({ ...s, type: nextType }))
    setStep(1)
    setFlowPhase("form")
  }, [pickedCategory, t])

  const goBack = useCallback(() => {
    setSubmitError(null)
    if (flowPhase === "form" && step === 1) {
      setFlowPhase("category")
      setPickedCategory(fictionTypeToCategoryPick(identity.type))
      setCategoryError(null)
      return
    }
    if (step === 2) {
      setStep(1)
      return
    }
    if (step === 3) {
      setStep(2)
      return
    }
    if (step === 4) {
      setStep(3)
      return
    }
    if (step === 5) {
      setStep(4)
      return
    }
    if (step === 6) {
      setStep(5)
      return
    }
    if (step === 7) {
      setStep(6)
      return
    }
  }, [flowPhase, identity.type, step])

  const handleStepsAsideNavigate = useCallback((target: FictionContributeStepsNavTarget) => {
    setSubmitError(null)
    if (target.kind === "category") {
      setFlowPhase("category")
      setPickedCategory(fictionTypeToCategoryPick(identity.type))
      setCategoryError(null)
      return
    }
    setStep(target.step)
  }, [identity.type])

  const toggleInterest = useCallback((id: string) => {
    setInterestIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }, [])

  const handleSubmit = useCallback(async () => {
    if (!validateAllForSubmit()) {
      return
    }
    setSubmitting(true)
    setSubmitError(null)

    const slug = generateSlug(identity.title) ?? ""
    const fd = new FormData()
    fd.set("title", identity.title.trim())
    fd.set("type", identity.type)
    fd.set("year", String(identity.year))
    fd.set("genre", identity.genre.trim())
    fd.set("description", identity.description.trim())
    fd.set("imdbId", showImdbField ? identity.imdbId.trim() : "")
    fd.set("runtimeMinutes", "")
    fd.set("slug", slug)
    fd.set("originalLanguage", identity.originalLanguage.trim())
    fd.set("contentLanguage", identity.contentLanguage.trim())
    if (identity.coverFile) {
      fd.set("coverFile", identity.coverFile)
      fd.set("coverFocusX", String(coverFocus.x))
      fd.set("coverFocusY", String(coverFocus.y))
    }
    if (identity.bannerFile instanceof File && identity.bannerFile.size > 0) {
      fd.set("bannerFile", identity.bannerFile)
      fd.set("bannerFocusX", String(bannerFocus.x))
      fd.set("bannerFocusY", String(bannerFocus.y))
    }

    const createRes = await createContributorFictionWithImagesAction(fd)
    if (!createRes.success) {
      setSubmitError(createRes.error)
      setSubmitting(false)
      return
    }

    const { fiction } = createRes
    const partialNotes: string[] = []

    if (interestIds.length > 0) {
      const ir = await setFictionInterestsAction(fiction.id, interestIds)
      if (!ir.success) {
        partialNotes.push(tf("donePartialInterestsNote"))
      }
    }

    const creditRes = await linkFictionPrimaryCreditAction({
      fictionId: fiction.id,
      fictionType: identity.type,
      creditName: director.trim(),
      personId: directorPersonId ?? undefined,
    })
    if (!creditRes.success) {
      partialNotes.push(tfCredit("donePartialDirectorNote", "donePartialAuthorNote"))
    }

    setSubmitting(false)

    const pathSeg = fiction.slug?.trim() || fiction.id
    const hasPartialFailure = partialNotes.length > 0
    setDoneState({
      variant: createRes.contributionAutoApproved ? "approved" : "pending",
      title: identity.title.trim(),
      coverSrc: coverPreviewUrl,
      fictionHref: `/fictions/${pathSeg}`,
      note: hasPartialFailure ? partialNotes.join(" ") : undefined,
    })
  }, [
    coverPreviewUrl,
    director,
    directorPersonId,
    identity,
    interestIds,
    showImdbField,
    tf,
    tfCredit,
    validateAllForSubmit,
  ])

  const previewInterestTags = useMemo(
    () =>
      interestIds.flatMap((id) => {
        const item = initialInterests.find((i) => i.id === id)
        return item != null ? [{ id: item.id, label: item.label }] : []
      }),
    [interestIds, initialInterests],
  )

  const fictionStepNavBlocked = useMemo(() => {
    if (step === 1) {
      const basicsKeys = ["title", "type", "year", "genre", "imdbId", "originalLanguage", "contentLanguage"] as const
      if (basicsKeys.some((k) => Boolean(step1Errors[k]))) return true
      if (showImdbField && identity.imdbId.trim()) {
        if (duplicateCheckLoading || Boolean(duplicateCheckError) || Boolean(duplicateMatch)) return true
      }
      return false
    }
    if (step === 2) {
      if (coverInspecting) return true
      const f = identity.coverFile
      const hasFile = f instanceof File && f.size > 0
      if (!hasFile) return true
      if (!coverImageDims) return true
      if (!isCoverAspectRatioOk(coverImageDims.width, coverImageDims.height)) return true
      if (
        coverImageDims &&
        !isCoverReadableResolutionOk(coverImageDims.width, coverImageDims.height)
      ) {
        return true
      }
      if (step1Errors.coverFile) return true
      return false
    }
    if (step === 3) {
      if (bannerInspecting) return true
      const f = identity.bannerFile
      const hasFile = f instanceof File && f.size > 0
      if (!hasFile) return false
      if (!bannerImageDims) return true
      if (!isBannerAspectRatioOk(bannerImageDims.width, bannerImageDims.height)) return true
      if (
        bannerImageDims &&
        !isBannerReadableResolutionOk(bannerImageDims.width, bannerImageDims.height)
      ) {
        return true
      }
      if (step1Errors.bannerFile) return true
      return false
    }
    if (step === 6) {
      if (!identity.description.trim()) return true
      return Boolean(step1Errors.description)
    }
    if (step === 5) {
      if (!director.trim()) return true
      return Object.keys(step3Errors).length > 0
    }
    return false
  }, [
    duplicateCheckError,
    duplicateCheckLoading,
    duplicateMatch,
    step,
    step1Errors,
    coverInspecting,
    identity.coverFile,
    coverImageDims,
    bannerInspecting,
    identity.bannerFile,
    bannerImageDims,
    director,
    identity.description,
    identity.imdbId,
    step3Errors,
    showImdbField,
  ])

  if (doneState) {
    return (
      <FictionContributeLayout mainColumnScroll={false}>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="flex h-full min-h-0 w-full flex-col items-center justify-center overflow-y-auto px-4 py-8"
        >
          <FictionContributeDoneView
            variant={doneState.variant}
            title={doneState.title}
            coverSrc={doneState.coverSrc}
            fictionHref={doneState.fictionHref}
            partialNote={doneState.note}
          />
        </motion.div>
      </FictionContributeLayout>
    )
  }

  const stepsAside = (
    <FictionContributeStepsAside flowPhase={flowPhase} step={step} onNavigate={handleStepsAsideNavigate} />
  )

  if (flowPhase === "category") {
    return (
      <FictionContributeLayout
        mainColumnScroll={false}
        leftAside={stepsAside}
        rightAside={<FictionContributeCategoryAside />}
      >
        <ContributionWizardShell
          stepIndex={0}
          totalSteps={TOTAL_STEPS}
          progressDotsIndex={0}
          progressDotsTotal={WIZARD_DOT_TRACK_TOTAL}
          contentMaxWidthClassName="max-w-lg"
          footerNav={{
            showBack: true,
            onBack: () => router.back(),
            backLabel: t("nav.back"),
            isLastStep: false,
            onNext: handleCategoryContinue,
            onSubmit: () => {},
            nextLabel: t("nav.continue"),
            disabled: !pickedCategory,
            loading: false,
            showTrailingArrow: true,
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="flex w-full flex-col pb-4"
          >
            <FictionContributeCategoryPicker
              selected={pickedCategory}
              onSelect={(id) => {
                setPickedCategory(id)
                setCategoryError(null)
              }}
              error={categoryError}
            />
          </motion.div>
        </ContributionWizardShell>
      </FictionContributeLayout>
    )
  }

  const contentWidth = step === 4 || step === 7 ? "max-w-[min(100%,1900px)]" : "max-w-md"
  const motionKey = String(step)

  const basicsPhaseLabel = tf("phaseBasics")
  const backLabel = t("nav.previous")

  return (
    <FictionContributeLayout
      mainColumnScroll={false}
      leftAside={stepsAside}
      rightAside={
        <FictionContributeCriteriaAside
          fictionType={identity.type}
          step={step}
          activeBasicsField={activeCriteriaBasicsField}
          coverCriterionChecks={coverCriterionChecks}
          coverPostUploadAside={Boolean(
            identity.coverFile instanceof File && identity.coverFile.size > 0,
          )}
          coverAsideError={step === 2 ? (step1Errors.coverFile ?? null) : null}
          bannerCriterionChecks={bannerCriterionChecks}
          bannerPostUploadAside={Boolean(
            identity.bannerFile instanceof File && identity.bannerFile.size > 0,
          )}
          bannerAsideError={step === 3 ? (step1Errors.bannerFile ?? null) : null}
        />
      }
    >
      <ContributionWizardShell
        stepIndex={step - 1}
        totalSteps={TOTAL_STEPS}
        progressDotsIndex={step}
        progressDotsTotal={WIZARD_DOT_TRACK_TOTAL}
        contentMaxWidthClassName={contentWidth}
        footerNav={{
          showBack: true,
          onBack: goBack,
          backLabel: step === 7 ? tf("publicPreviewBack") : backLabel,
          isLastStep: step === 7,
          onNext: goNext,
          onSubmit: handleSubmit,
          submitLabel: step === 7 ? tf("publicPreviewSubmit") : undefined,
          loading: submitting,
          disabled: submitting || fictionStepNavBlocked,
          showTrailingArrow: true,
        }}
      >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={motionKey}
          variants={stepVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="flex w-full flex-col"
        >
              {step === 1 && (
                <div className="w-full space-y-4">
                  <ContributeStepHeader
                    variant="minimal"
                    badge="required"
                    stepNumber={1}
                    totalSteps={TOTAL_STEPS}
                    phaseLabel={basicsPhaseLabel}
                    title={tf("identityTitle")}
                    description={tf("identityDescriptionBasics")}
                  />

                  <div data-contribute-basics-field="title">
                    <ContributeFieldWrapper label={tf("fieldTitle")} required error={step1Errors.title}>
                      <input
                        type="text"
                        value={identity.title}
                        onChange={(e) => {
                          clearStep1BasicsFieldError("title")
                          setIdentity((s) => ({ ...s, title: e.target.value }))
                        }}
                        onFocus={() => focusBasicsCriterion("title")}
                        onBlur={blurBasicsCriterion}
                        className={INPUT_ROW}
                        placeholder={tf("titlePlaceholder")}
                      />
                    </ContributeFieldWrapper>
                  </div>

                  {showImdbField ? (
                  <div data-contribute-basics-field="imdbId">
                    <ContributeFieldWrapper
                      label={tf("fieldImdb")}
                      hint={tf("imdbHint")}
                      error={step1Errors.imdbId}
                    >
                      <div className={INPUT_ROW_COMBO.shell}>
                        <span
                          className={INPUT_ROW_COMBO.prefix}
                          title={IMDB_TITLE_URL_PREFIX}
                          aria-hidden
                        >
                          <span className="truncate">{IMDB_TITLE_URL_PREFIX}</span>
                        </span>
                        <input
                          type="text"
                          autoComplete="off"
                          spellCheck={false}
                          value={identity.imdbId}
                          onChange={(e) => {
                            clearStep1BasicsFieldError("imdbId")
                            setIdentity((s) => ({ ...s, imdbId: e.target.value.replace(/\s/g, "") }))
                          }}
                          onFocus={() => focusBasicsCriterion("imdbId")}
                          onBlur={blurBasicsCriterion}
                          className={INPUT_ROW_COMBO.input}
                          placeholder="tt0468569"
                        />
                      </div>
                    </ContributeFieldWrapper>
                  </div>
                  ) : null}

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div data-contribute-basics-field="year">
                      <ContributeFieldWrapper label={tf("fieldYear")} required error={step1Errors.year}>
                        <input
                          type="number"
                          min={1900}
                          max={new Date().getFullYear()}
                          value={identity.year}
                          onChange={(e) => {
                            clearStep1BasicsFieldError("year")
                            setIdentity((s) => ({ ...s, year: parseInt(e.target.value, 10) || s.year }))
                          }}
                          onFocus={() => focusBasicsCriterion("year")}
                          onBlur={blurBasicsCriterion}
                          className={INPUT_ROW}
                        />
                      </ContributeFieldWrapper>
                    </div>
                    <div data-contribute-basics-field="genre">
                      <ContributeFieldWrapper label={tf("fieldGenre")} required error={step1Errors.genre}>
                        <select
                          value={identity.genre}
                          onChange={(e) => {
                            clearStep1BasicsFieldError("genre")
                            setIdentity((s) => ({ ...s, genre: e.target.value }))
                          }}
                          onFocus={() => focusBasicsCriterion("genre")}
                          onBlur={blurBasicsCriterion}
                          className={INPUT_ROW}
                        >
                          <option value="">{tf("genrePlaceholder")}</option>
                          {FICTION_GENRES.map((g) => (
                            <option key={g} value={g}>
                              {g}
                            </option>
                          ))}
                        </select>
                      </ContributeFieldWrapper>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div data-contribute-basics-field="originalLanguage">
                      <ContributeFieldWrapper
                        label={tf("fieldOriginalLanguage")}
                        required
                        hint={tf("fieldOriginalLanguageHint")}
                        error={step1Errors.originalLanguage}
                      >
                        <select
                          value={identity.originalLanguage}
                          onChange={(e) => {
                            clearStep1BasicsFieldError("originalLanguage")
                            setIdentity((s) => ({ ...s, originalLanguage: e.target.value }))
                          }}
                          className={INPUT_ROW}
                        >
                          <option value="">{tf("languagePlaceholder")}</option>
                          {FICTION_LANGUAGE_CODES.map((code) => (
                            <option key={code} value={code}>
                              {FICTION_LANGUAGE_LABELS[code]}
                            </option>
                          ))}
                        </select>
                      </ContributeFieldWrapper>
                    </div>
                    <div data-contribute-basics-field="contentLanguage">
                      <ContributeFieldWrapper
                        label={tf("fieldContentLanguage")}
                        required
                        hint={tf("fieldContentLanguageHint")}
                        error={step1Errors.contentLanguage}
                      >
                        <select
                          value={identity.contentLanguage}
                          onChange={(e) => {
                            clearStep1BasicsFieldError("contentLanguage")
                            setIdentity((s) => ({ ...s, contentLanguage: e.target.value }))
                          }}
                          className={INPUT_ROW}
                        >
                          <option value="">{tf("languagePlaceholder")}</option>
                          {FICTION_LANGUAGE_CODES.map((code) => (
                            <option key={code} value={code}>
                              {FICTION_LANGUAGE_LABELS[code]}
                            </option>
                          ))}
                        </select>
                      </ContributeFieldWrapper>
                    </div>
                  </div>

                  {showImdbField && identity.imdbId.trim() ? (
                    <div className="space-y-3 rounded-xl border border-border/80 bg-muted/15 px-4 py-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {tf("duplicateCheckInlineHeading")}
                      </p>
                      {duplicateCheckLoading ? (
                        <div className="flex flex-col items-center gap-2 py-4">
                          <Loader2 className="h-6 w-6 shrink-0 animate-spin text-muted-foreground" aria-hidden />
                          <p className="text-center text-sm text-muted-foreground">{tf("duplicateChecking")}</p>
                        </div>
                      ) : duplicateCheckError ? (
                        <div className="space-y-2">
                          <p className="text-sm text-destructive" role="alert">
                            {duplicateCheckError}
                          </p>
                          <Button
                            type="button"
                            variant="outline"
                            className="h-9 rounded-lg px-4 text-sm"
                            onClick={() => setDuplicateCheckToken((n) => n + 1)}
                          >
                            {tf("duplicateCheckRetry")}
                          </Button>
                        </div>
                      ) : duplicateMatch ? (
                        <div className="space-y-3">
                          <p className="text-sm font-medium text-foreground">{tf("duplicateFoundTitle")}</p>
                          <p className="text-sm text-muted-foreground">
                            {tf("duplicateFoundBody", {
                              title: duplicateMatch.title,
                              year:
                                duplicateMatch.year != null && Number.isFinite(duplicateMatch.year)
                                  ? String(duplicateMatch.year)
                                  : "—",
                            })}
                          </p>
                          <Button asChild className="h-9 w-fit rounded-lg px-4 text-sm font-medium">
                            <Link href={`/fictions/${duplicateMatch.slug?.trim() || duplicateMatch.id}`}>
                              {tf("duplicateViewExisting")}
                            </Link>
                          </Button>
                          <p className="text-xs text-muted-foreground">{tf("duplicateBlockedHint")}</p>
                        </div>
                      ) : (
                        <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-3">
                          <p className="text-sm font-medium text-foreground">{tf("duplicateSystemCheckTitle")}</p>
                          <p className="mt-1 text-sm text-muted-foreground">{tf("duplicateSystemCheckBody")}</p>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              )}

              {step === 2 && (
                <div className="w-full space-y-4">
                  <ContributeStepHeader
                    variant="minimal"
                    badge="required"
                    stepNumber={2}
                    totalSteps={TOTAL_STEPS}
                    phaseLabel={tf("phaseCover")}
                    title={tf("identityTitle")}
                    description={tf("identityDescriptionCover")}
                  />

                  <section className="space-y-2.5">
                    <input
                      ref={coverInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="hidden"
                      onChange={(e) => {
                        void (async () => {
                          const file = e.target.files?.[0]
                          e.target.value = ""
                          if (!file) {
                            setCoverInspecting(false)
                            setIdentity((s) => ({ ...s, coverFile: null }))
                            setCoverImageDims(null)
                            setStep1Errors((prev) => {
                              const next = { ...prev }
                              delete next.coverFile
                              return next
                            })
                            return
                          }
                          setCoverInspecting(true)
                          setSubmitError(null)
                          setStep1Errors((prev) => {
                            const next = { ...prev }
                            delete next.coverFile
                            return next
                          })
                          try {
                            const parsed = contributeSchemas.cover.safeParse({ coverFile: file })
                            if (!parsed.success) {
                              setStep1Errors((prev) => ({ ...prev, ...zodIssuesToRecord(parsed.error) }))
                              return
                            }
                            const dims = await loadImageDimensionsFromFile(file)
                            setIdentity((s) => ({ ...s, coverFile: file }))
                            setCoverImageDims(dims)
                            if (!isCoverAspectRatioOk(dims.width, dims.height)) {
                              setStep1Errors((prev) => ({
                                ...prev,
                                coverFile: tVal("coverAspectInvalid"),
                              }))
                            } else if (!isCoverReadableResolutionOk(dims.width, dims.height)) {
                              setStep1Errors((prev) => ({
                                ...prev,
                                coverFile: tVal("imageResolutionLow"),
                              }))
                            } else {
                              setStep1Errors((prev) => {
                                const next = { ...prev }
                                delete next.coverFile
                                return next
                              })
                            }
                          } catch {
                            setIdentity((s) => ({ ...s, coverFile: null }))
                            setCoverImageDims(null)
                            setStep1Errors((prev) => ({
                              ...prev,
                              coverFile: tVal("coverImageLoadFailed"),
                            }))
                          } finally {
                            setCoverInspecting(false)
                          }
                        })()
                      }}
                    />

                    <ContributeFieldWrapper label={tf("fieldCover")} required>
                      <div className="mx-auto flex w-full max-w-[336px] flex-col items-center">
                        {coverPreviewUrl ? (
                          <div className="w-full max-w-[336px] space-y-2">
                            <ImageFocusPicker
                              src={coverPreviewUrl}
                              alt={tf("coverPreviewAlt")}
                              aspectRatio="2 / 3"
                              focus={coverFocus}
                              onFocusChange={setCoverFocus}
                              disabled={coverInspecting}
                            />
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                disabled={coverInspecting}
                                onClick={() => coverInputRef.current?.click()}
                                className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium"
                              >
                                {tf("change")}
                              </button>
                              <button
                                type="button"
                                disabled={coverInspecting}
                                onClick={clearContributedCover}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border"
                                aria-label={tf("removeCoverAria")}
                              >
                                <X className="h-4 w-4" strokeWidth={2.25} />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={coverInspecting}
                            aria-busy={coverInspecting}
                            onClick={() => coverInputRef.current?.click()}
                            className="group relative flex aspect-[2/3] w-full max-w-[336px] items-center justify-center overflow-hidden rounded-xl border border-border bg-muted/30 text-muted-foreground transition-colors hover:border-foreground/30 hover:bg-muted/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-60"
                          >
                            <ImagePlus className="h-10 w-10" />
                          </button>
                        )}
                      </div>
                      {coverInspecting ? (
                        <p className="mt-2 text-center text-xs text-muted-foreground">{tf("coverInspecting")}</p>
                      ) : null}
                    </ContributeFieldWrapper>
                  </section>
                </div>
              )}

              {step === 3 && (
                <div className="w-full space-y-4">
                  <ContributeStepHeader
                    variant="minimal"
                    badge="enrichment"
                    stepNumber={3}
                    totalSteps={TOTAL_STEPS}
                    phaseLabel={tf("phaseBanner")}
                    title={tf("identityTitle")}
                    description={tf("identityDescriptionBanner")}
                  />

                  <section className="space-y-2.5">
                    <input
                      ref={bannerInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="hidden"
                      onChange={(e) => {
                        void (async () => {
                          const file = e.target.files?.[0]
                          e.target.value = ""
                          if (!file) {
                            setBannerInspecting(false)
                            setIdentity((s) => ({ ...s, bannerFile: undefined }))
                            setBannerImageDims(null)
                            setStep1Errors((prev) => {
                              const next = { ...prev }
                              delete next.bannerFile
                              return next
                            })
                            return
                          }
                          setBannerInspecting(true)
                          setSubmitError(null)
                          setStep1Errors((prev) => {
                            const next = { ...prev }
                            delete next.bannerFile
                            return next
                          })
                          try {
                            const parsed = contributeSchemas.banner.safeParse({ bannerFile: file })
                            if (!parsed.success) {
                              setStep1Errors((prev) => ({ ...prev, ...zodIssuesToRecord(parsed.error) }))
                              return
                            }
                            const dims = await loadImageDimensionsFromFile(file)
                            setIdentity((s) => ({ ...s, bannerFile: file }))
                            setBannerImageDims(dims)
                            if (!isBannerAspectRatioOk(dims.width, dims.height)) {
                              setStep1Errors((prev) => ({
                                ...prev,
                                bannerFile: tVal("bannerAspectInvalid"),
                              }))
                            } else if (!isBannerReadableResolutionOk(dims.width, dims.height)) {
                              setStep1Errors((prev) => ({
                                ...prev,
                                bannerFile: tVal("imageResolutionLow"),
                              }))
                            } else {
                              setStep1Errors((prev) => {
                                const next = { ...prev }
                                delete next.bannerFile
                                return next
                              })
                            }
                          } catch {
                            setIdentity((s) => ({ ...s, bannerFile: undefined }))
                            setBannerImageDims(null)
                            setStep1Errors((prev) => ({
                              ...prev,
                              bannerFile: tVal("bannerImageLoadFailed"),
                            }))
                          } finally {
                            setBannerInspecting(false)
                          }
                        })()
                      }}
                    />

                    <ContributeFieldWrapper label={tf("fieldBanner")}>
                      <div className="mx-auto flex w-full max-w-xl flex-col items-center">
                        {bannerPreviewUrl ? (
                          <div className="w-full max-w-xl space-y-2">
                            <ImageFocusPicker
                              src={bannerPreviewUrl}
                              alt={tf("bannerPreviewAlt")}
                              aspectRatio="21 / 9"
                              focus={bannerFocus}
                              onFocusChange={setBannerFocus}
                              disabled={bannerInspecting}
                            />
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                disabled={bannerInspecting}
                                onClick={() => bannerInputRef.current?.click()}
                                className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium"
                              >
                                {tf("change")}
                              </button>
                              <button
                                type="button"
                                disabled={bannerInspecting}
                                onClick={clearContributedBanner}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border"
                                aria-label={tf("removeBannerAria")}
                              >
                                <X className="h-4 w-4" strokeWidth={2.25} />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={bannerInspecting}
                            aria-busy={bannerInspecting}
                            onClick={() => bannerInputRef.current?.click()}
                            className="group relative flex aspect-video w-full max-w-xl items-center justify-center overflow-hidden rounded-xl border border-border bg-muted/30 text-muted-foreground transition-colors hover:border-foreground/30 hover:bg-muted/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-60"
                          >
                            <ImagePlus className="h-10 w-10" />
                          </button>
                        )}
                      </div>
                      {bannerInspecting ? (
                        <p className="mt-2 text-center text-xs text-muted-foreground">{tf("coverInspecting")}</p>
                      ) : null}
                    </ContributeFieldWrapper>
                  </section>
                </div>
              )}

              {step === 4 && (
                <div className="w-full space-y-4">
                  <div className="mx-auto w-full max-w-md">
                    <ContributeStepHeader
                      variant="minimal"
                      badge="enrichment"
                      stepNumber={4}
                      totalSteps={TOTAL_STEPS}
                      title={tf("classificationTitle")}
                      description={tf("classificationDescription")}
                    />
                  </div>
                  {initialInterests.length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground">{tf("noInterests")}</p>
                  ) : (
                    <div className="flex w-full flex-wrap justify-center gap-x-2 gap-y-2">
                      {initialInterests.map((interest) => {
                        const active = interestIds.includes(interest.id)
                        return (
                          <button
                            key={interest.id}
                            type="button"
                            onClick={() => toggleInterest(interest.id)}
                            aria-pressed={active}
                            className={cn(
                              "inline-flex min-h-9 max-w-[min(100%,20rem)] shrink-0 items-center justify-center gap-1 rounded-full border px-3.5 py-2 text-xs font-medium transition-colors sm:text-sm",
                              active
                                ? "border-foreground bg-foreground text-background"
                                : "border-border bg-muted text-muted-foreground",
                            )}
                            title={interest.key}
                          >
                            <span className="text-center leading-snug">{interest.label}</span>
                            {active ? <Check className="h-3 w-3 shrink-0" aria-hidden /> : null}
                          </button>
                        )
                      })}
                    </div>
                  )}
                  <button
                    type="button"
                    className="mx-auto block text-sm text-muted-foreground transition-opacity hover:opacity-70"
                    onClick={() => setStep(5)}
                  >
                    {tf("skipStep")}
                  </button>
                </div>
              )}

              {step === 5 && (
                <div className="w-full space-y-4">
                  <ContributeStepHeader
                    variant="minimal"
                    badge="enrichment"
                    stepNumber={5}
                    totalSteps={TOTAL_STEPS}
                    title={tf("teamTitle")}
                    description={tfCredit("teamDescription", "teamDescriptionBook")}
                  />

                  <p className="text-xs text-muted-foreground">
                    {tfCredit("directorCatalogHint", "authorCatalogHint")}
                  </p>
                  <div className="space-y-2">
                    <label className="sr-only" htmlFor={`${baseId}-director-filter`}>
                      {tfCredit("directorFilterLabel", "authorFilterLabel")}
                    </label>
                    <input
                      id={`${baseId}-director-filter`}
                      type="search"
                      value={directorCatalogFilter}
                      onChange={(e) => setDirectorCatalogFilter(e.target.value)}
                      className={INPUT_ROW}
                      placeholder={tfCredit("directorFilterPlaceholder", "authorFilterPlaceholder")}
                      autoComplete="off"
                    />
                    <div className="max-h-52 overflow-y-auto overscroll-contain rounded-xl border border-border bg-card/20">
                      {directorCatalogLoading ? (
                        <p className="px-3 py-3 text-center text-sm text-muted-foreground">
                          {tfCredit("directorCatalogLoading", "authorCatalogLoading")}
                        </p>
                      ) : filteredDirectorCatalog.length === 0 &&
                        directorCatalog.length === 0 &&
                        !directorCatalogFilter.trim() ? (
                        <p className="px-3 py-3 text-center text-sm text-muted-foreground">
                          {tfCredit("directorCatalogNoDirectorsYet", "authorCatalogNoAuthorsYet")}
                        </p>
                      ) : filteredDirectorCatalog.length === 0 ? (
                        <p className="px-3 py-3 text-center text-sm text-muted-foreground">
                          {tfCredit("directorCatalogEmpty", "authorCatalogEmpty")}
                        </p>
                      ) : (
                        <ul className="divide-y divide-border">
                          {filteredDirectorCatalog.map((p) => {
                            const selected = director.trim().toLowerCase() === p.name.trim().toLowerCase()
                            return (
                              <li key={p.id}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDirector(p.name)
                                    setDirectorPersonId(p.id)
                                    setStep3Errors((prev) => {
                                      if (!prev.director) return prev
                                      const next = { ...prev }
                                      delete next.director
                                      return next
                                    })
                                  }}
                                  className={cn(
                                    "flex w-full items-center px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted/60",
                                    selected && "bg-accent/50 text-accent-foreground",
                                  )}
                                >
                                  {p.name}
                                </button>
                              </li>
                            )
                          })}
                        </ul>
                      )}
                    </div>
                  </div>
                  <ContributeFieldWrapper
                    label={tfCredit("fieldDirector", "fieldAuthor")}
                    required
                    error={step3Errors.director}
                  >
                    <input
                      type="text"
                      value={director}
                      onChange={(e) => {
                        setDirector(e.target.value)
                        setDirectorPersonId(null)
                        setStep3Errors((prev) => {
                          if (!prev.director) return prev
                          const next = { ...prev }
                          delete next.director
                          return next
                        })
                      }}
                      className={INPUT_ROW}
                      placeholder={tfCredit("directorPlaceholder", "authorPlaceholder")}
                    />
                  </ContributeFieldWrapper>

                  <button
                    type="button"
                    className="mx-auto block text-sm text-muted-foreground transition-opacity hover:opacity-70"
                    onClick={() => {
                      setIdentity((s) => ({
                        ...s,
                        description: s.description.trim() || buildFictionContributeAutoDescription(s, director),
                      }))
                      setStep(6)
                    }}
                  >
                    {tf("skipStep")}
                  </button>
                </div>
              )}

              {step === 6 && (
                <div className="w-full space-y-4">
                  <ContributeStepHeader
                    variant="minimal"
                    badge="required"
                    stepNumber={6}
                    totalSteps={TOTAL_STEPS}
                    title={tf("descriptionStepTitle")}
                    description={tf("descriptionStepLead")}
                  />
                  <ContributeFieldWrapper
                    label={tf("fieldDescription")}
                    required
                    error={step1Errors.description}
                    hint={tf("descriptionWordCounter", {
                      count: descriptionWordCount,
                      min: FICTION_CONTRIBUTE_DESCRIPTION_WORD_MIN,
                      max: FICTION_CONTRIBUTE_DESCRIPTION_WORD_MAX,
                    })}
                    hintTone={descriptionWordCountInSuggestedRange ? "success" : "warning"}
                  >
                    <textarea
                      value={identity.description}
                      onChange={(e) => {
                        setStep1Errors((e) => {
                          if (!e.description) return e
                          const next = { ...e }
                          delete next.description
                          return next
                        })
                        setIdentity((s) => ({ ...s, description: e.target.value }))
                      }}
                      rows={8}
                      className={INPUT_AREA}
                    />
                  </ContributeFieldWrapper>
                </div>
              )}

              {step === 7 && (
                <div className="w-full space-y-3">
                  {submitError ? (
                    <p className="text-center text-xs text-destructive">{submitError}</p>
                  ) : null}

                  <FictionContributeFppRewardCompactStrip className="min-[900px]:hidden" />

                  <FictionContributePublicPreview
                    title={identity.title}
                    type={identity.type}
                    year={identity.year}
                    genre={identity.genre}
                    description={identity.description}
                    bannerSrc={bannerPreviewUrl}
                    coverSrc={coverPreviewUrl}
                    creditLine={director.trim() || null}
                    interestTags={previewInterestTags}
                    summaryText={
                      identity.description.trim().length > 160
                        ? `${identity.description.trim().slice(0, 157)}…`
                        : identity.description.trim() || null
                    }
                  />
                </div>
              )}

            </motion.div>
          </AnimatePresence>
      </ContributionWizardShell>
    </FictionContributeLayout>
  )
}
