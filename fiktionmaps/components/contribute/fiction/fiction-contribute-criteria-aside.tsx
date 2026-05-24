"use client"

import type { LucideIcon } from "lucide-react"
import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  Check,
  Eye,
  FileImage,
  ImageIcon,
  ImagePlay,
  Languages,
  LayoutList,
  Link2,
  ListChecks,
  Ratio,
  ScrollText,
  Search,
  Sparkles,
  Tag,
  Users,
  UserSquare2,
} from "lucide-react"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"
import { FictionContributeFppRewardCard } from "@/components/contribute/fiction/fiction-contribute-fpp-reward-card"
import type { Fiction } from "@/src/fictions/domain/fiction.entity"

export type ContributeBasicsCriterionKey = "title" | "imdbId" | "year" | "genre"

interface FictionContributeCriteriaAsideProps {
  fictionType: Fiction["type"]
  step: 1 | 2 | 3 | 4 | 5 | 6 | 7
  activeBasicsField?: ContributeBasicsCriterionKey | null
  /** Alineado a `cover1`…`cover4` en el paso portada (solo coloreado tras subir foto). */
  coverCriterionChecks?: readonly [boolean, boolean, boolean, boolean]
  /** Con portada ya cargada: checklist con tilde verde / aviso en ícono (sin fondos de color en la fila). */
  coverPostUploadAside?: boolean
  /** Único lugar para mensajes de validación del paso portada (p. ej. ratio, formato). */
  coverAsideError?: string | null
  /** Checklist banner, alineado a banner1…4. */
  bannerCriterionChecks?: readonly [boolean, boolean, boolean, boolean]
  bannerPostUploadAside?: boolean
  bannerAsideError?: string | null
}

type CriterionRow = {
  text: string
  icon: LucideIcon
  fields?: readonly ContributeBasicsCriterionKey[]
}

type ContributeT = (key: string) => string

function criteriaSection(
  t: ContributeT,
  step: 1 | 2 | 3 | 4 | 5 | 6,
  fictionType: Fiction["type"],
): { title: string; rows: CriterionRow[] } {
  const showImdb = fictionType === "movie" || fictionType === "tv-series"
  const c = (k: string) => t(`criteria.${k}`)

  if (step === 1) {
    const basicsRows: CriterionRow[] = [
      {
        icon: Languages,
        text: showImdb ? c("rowTitleImdb") : c("rowTitleBook"),
        fields: ["title"],
      },
      ...(showImdb
        ? [
            {
              icon: Link2,
              text: c("rowImdbId"),
              fields: ["imdbId"] as const,
            },
          ]
        : []),
      {
        icon: Calendar,
        text: showImdb ? c("rowYearImdb") : c("rowYearBook"),
        fields: ["year"],
      },
      {
        icon: Tag,
        text: c("rowGenre"),
        fields: ["genre"],
      },
    ]
    if (showImdb) {
      basicsRows.push(
        { icon: Search, text: c("duplicateAside1") },
        { icon: UserSquare2, text: c("duplicateAside2") },
      )
    }
    return {
      title: c("sectionIdentityBasics"),
      rows: basicsRows,
    }
  }
  if (step === 2) {
    return {
      title: c("sectionIdentityCover"),
      rows: [
        { icon: ImageIcon, text: c("cover1") },
        { icon: Ratio, text: c("cover2") },
        { icon: FileImage, text: c("cover3") },
        { icon: Eye, text: c("cover4") },
      ],
    }
  }
  if (step === 3) {
    return {
      title: c("sectionIdentityBanner"),
      rows: [
        { icon: ImagePlay, text: c("banner1") },
        { icon: FileImage, text: c("banner2") },
        { icon: LayoutList, text: c("banner3") },
        { icon: ListChecks, text: c("banner4") },
      ],
    }
  }
  if (step === 4) {
    return {
      title: c("sectionClassification"),
      rows: [
        { icon: Sparkles, text: c("classify1") },
        { icon: ListChecks, text: c("classify2") },
      ],
    }
  }
  if (step === 5) {
    return {
      title: c("sectionTeam"),
      rows: [
        { icon: UserSquare2, text: c("team1") },
        { icon: Users, text: c("team2") },
        { icon: AlertCircle, text: c("team4") },
      ],
    }
  }
  return {
    title: c("sectionDescription"),
    rows: [
      { icon: ScrollText, text: c("descriptionAside1") },
      { icon: ListChecks, text: c("descriptionAside2") },
    ],
  }
}

function rowIsHighlighted(
  row: CriterionRow,
  step: 1 | 2 | 3 | 4 | 5 | 6 | 7,
  active: ContributeBasicsCriterionKey | null,
): boolean {
  if (!active || step !== 1) return false
  return row.fields?.includes(active) ?? false
}

export function FictionContributeCriteriaAside({
  fictionType,
  step,
  activeBasicsField = null,
  coverCriterionChecks,
  coverPostUploadAside = false,
  coverAsideError = null,
  bannerCriterionChecks,
  bannerPostUploadAside = false,
  bannerAsideError = null,
}: FictionContributeCriteriaAsideProps) {
  const t = useTranslations("Contribute")
  const tf = useTranslations("Contribute.fiction")

  if (step === 7) {
    const tc = (k: string) => t(`criteria.${k}`)
    return (
      <div className="mx-auto flex h-full min-h-0 w-full max-w-[min(280px,100%)] flex-col self-stretch pb-6">
        <div className="min-h-0 shrink-0">
          <h2 className="text-base font-semibold leading-snug text-foreground sm:text-[1.0625rem]">
            {tf("publicPreviewTitle")}
          </h2>
          <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">{tf("publicPreviewDescription")}</p>
          <p className="mt-4 text-xs leading-relaxed text-muted-foreground/90">{tc("reviewPending")}</p>
        </div>
        <div className="mt-auto shrink-0 pt-5">
          <FictionContributeFppRewardCard />
        </div>
      </div>
    )
  }

  const { title, rows } = criteriaSection(t, step, fictionType)
  const coverChecks = coverCriterionChecks
  const showCoverChecklist = step === 2 && coverChecks != null
  const useCoverPostUploadUi = showCoverChecklist && coverPostUploadAside

  const bannerChecks = bannerCriterionChecks
  const showBannerChecklist = step === 3 && bannerChecks != null
  const useBannerPostUploadUi = showBannerChecklist && bannerPostUploadAside

  const postUploadChecks =
    useCoverPostUploadUi && coverChecks
      ? coverChecks
      : useBannerPostUploadUi && bannerChecks
        ? bannerChecks
        : null
  const usePostUploadRowStyle = postUploadChecks != null

  const asideError = coverAsideError ?? bannerAsideError ?? null

  return (
    <div className="mx-auto w-full max-w-full space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {t("criteria.heading")}
      </h2>
      <div>
        <p className="text-sm font-semibold leading-snug text-foreground">{title}</p>
        {asideError ? (
          <p role="alert" className="mt-2 text-xs font-medium leading-snug text-destructive">
            {asideError}
          </p>
        ) : null}
        <ul className="mt-2 space-y-2">
          {rows.map((row, i) => {
            const active = rowIsHighlighted(row, step, activeBasicsField)
            const Icon = row.icon
            const done = postUploadChecks ? postUploadChecks[i] : false

            return (
              <li key={`${step}-${i}`}>
                <div
                  className={cn(
                    "grid grid-cols-[auto_1fr] gap-x-2.5 text-xs transition-colors duration-150 sm:text-sm",
                    usePostUploadRowStyle
                      ? "rounded-md py-0.5 px-0.5 text-muted-foreground"
                      : cn("rounded-md py-0.5", active ? "bg-muted/80 text-foreground" : "text-muted-foreground"),
                  )}
                >
                  <span
                    className={cn(
                      "flex shrink-0 items-center justify-center self-start pt-[0.2em]",
                      usePostUploadRowStyle ? "" : active ? "text-foreground" : "text-muted-foreground",
                    )}
                    aria-hidden
                  >
                    {usePostUploadRowStyle ? (
                      done ? (
                        <Check className="h-4 w-4 shrink-0 text-emerald-600" strokeWidth={2.25} />
                      ) : (
                        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" strokeWidth={2.25} />
                      )
                    ) : (
                      <Icon className="h-4 w-4 shrink-0 stroke-[1.75]" />
                    )}
                  </span>
                  <span
                    className={cn(
                      "min-w-0 leading-snug",
                      usePostUploadRowStyle ? "" : active ? "font-medium" : "",
                    )}
                  >
                    {row.text}
                  </span>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
