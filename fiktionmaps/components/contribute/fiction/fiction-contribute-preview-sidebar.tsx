"use client"

import Image from "next/image"
import { useTranslations } from "next-intl"
import { DEFAULT_FICTION_COVER } from "@/lib/constants/placeholders"
import { cn } from "@/lib/utils"
import {
  FICTION_SLUG_DETAIL_SIDEBAR_RIGHT_GAP_PX,
  FICTION_SLUG_DETAIL_SIDEBAR_WIDTH_PX,
} from "@/components/fictions/fiction-slug-detail-shell"
import type { Fiction } from "@/src/fictions/domain/fiction.entity"

export function FictionContributePreviewSidebar({
  title,
  type,
  year,
  genre,
  creditLine,
  coverSrc,
  summaryText,
}: {
  title: string
  type: Fiction["type"]
  year: number
  genre: string
  creditLine?: string | null
  coverSrc: string | null
  summaryText?: string | null
}) {
  const t = useTranslations("Fictions")
  const typeLabel =
    type === "tv-series" ? t("typeTvSeries") : type === "book" ? t("typeBook") : t("typeMovie")

  const cover = coverSrc?.trim() || DEFAULT_FICTION_COVER

  return (
    <div
      className={cn("hidden py-10 lg:flex", "justify-end")}
      style={{ paddingRight: `${FICTION_SLUG_DETAIL_SIDEBAR_RIGHT_GAP_PX}px` }}
    >
      <div className="space-y-3.5" style={{ width: `${FICTION_SLUG_DETAIL_SIDEBAR_WIDTH_PX}px` }}>
        <div className="relative ml-auto aspect-[2/3] w-full overflow-hidden rounded-lg border border-border/60 bg-muted/30">
          <Image
            src={cover}
            alt={title}
            fill
            className="object-cover"
            sizes={`${FICTION_SLUG_DETAIL_SIDEBAR_WIDTH_PX}px`}
            unoptimized={cover.startsWith("blob:")}
          />
        </div>

        <div className="space-y-2">
          <h2 className="max-w-full break-words font-serif text-[1.35rem] font-semibold leading-tight text-foreground xl:text-[1.5rem]">
            {title || "—"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {year || "—"}
            {genre ? ` · ${genre}` : ""}
            {creditLine?.trim() ? ` · ${creditLine.trim()}` : ""}
          </p>
        </div>

        {summaryText?.trim() ? (
          <p className="line-clamp-4 text-[12px] leading-5 text-muted-foreground">{summaryText.trim()}</p>
        ) : null}

        <div className="border-t border-border/60 pt-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground">{t("sidebarDetails")}</p>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
            <dt className="text-muted-foreground">{t("sidebarType")}</dt>
            <dd className="font-medium text-foreground">{typeLabel}</dd>
            <dt className="text-muted-foreground">{t("sidebarYear")}</dt>
            <dd className="font-medium text-foreground">{year || "—"}</dd>
            <dt className="text-muted-foreground">{t("sidebarGenre")}</dt>
            <dd className="font-medium text-foreground">{genre || "—"}</dd>
          </dl>
        </div>
      </div>
    </div>
  )
}
