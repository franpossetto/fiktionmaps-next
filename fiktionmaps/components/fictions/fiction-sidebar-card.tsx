import Image from "next/image"
import { getTranslations } from "next-intl/server"
import { cn } from "@/lib/utils"
import { DEFAULT_FICTION_COVER } from "@/lib/constants/placeholders"
import type { FictionWithMedia } from "@/src/fictions/domain/fiction.entity"
import { FICTION_LANGUAGE_LABELS, type FictionLanguageCode } from "@/lib/constants/fiction-languages"

type SidebarAlign = "left" | "center" | "right"

const ALIGN_CLASS: Record<SidebarAlign, string> = {
  left: "justify-start",
  center: "justify-center",
  right: "justify-end",
}

export interface FictionSidebarCardProps {
  fiction: FictionWithMedia
  align?: SidebarAlign
  containerWidthPx?: number
  rightOffsetPx?: number
  summaryText?: string
}

export async function FictionSidebarCard({
  fiction,
  align = "right",
  containerWidthPx = 185,
  rightOffsetPx = 13,
  summaryText,
}: FictionSidebarCardProps) {
  const t = await getTranslations("Fictions")
  const typeLabel =
    fiction.type === "tv-series"
      ? t("typeTvSeries")
      : fiction.type === "book"
        ? t("typeBook")
        : t("typeMovie")
  return (
    <div className={cn("hidden py-10 lg:flex", ALIGN_CLASS[align])} style={{ paddingRight: `${rightOffsetPx}px` }}>
      <div className="space-y-3.5" style={{ width: `${containerWidthPx}px` }}>
        <div className="relative ml-auto aspect-[2/3] w-full overflow-hidden rounded-lg border border-border/60 bg-muted/30">
          <Image
            src={fiction.coverImage?.trim() || fiction.coverImageLarge?.trim() || DEFAULT_FICTION_COVER}
            alt={fiction.title}
            fill
            className="object-cover"
            sizes={`${containerWidthPx}px`}
          />
        </div>

        <div className="space-y-2">
          <h2 className="max-w-full break-words font-serif text-[1.35rem] font-semibold leading-tight text-foreground xl:text-[1.5rem]">
            {fiction.title}
          </h2>
          <p className="text-sm text-muted-foreground">
            {fiction.year || "—"}
            {fiction.genre ? ` · ${fiction.genre}` : ""}
            {fiction.author ? ` · ${fiction.author}` : ""}
          </p>
        </div>

        {summaryText && <p className="line-clamp-4 text-[12px] leading-5 text-muted-foreground">{summaryText}</p>}

        <div className="border-t border-border/60 pt-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground">{t("sidebarDetails")}</p>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
            <dt className="text-muted-foreground">{t("sidebarType")}</dt>
            <dd className="font-medium text-foreground">{typeLabel}</dd>
            <dt className="text-muted-foreground">{t("sidebarYear")}</dt>
            <dd className="font-medium text-foreground">{fiction.year || "—"}</dd>
            <dt className="text-muted-foreground">{t("sidebarGenre")}</dt>
            <dd className="font-medium text-foreground">{fiction.genre || "—"}</dd>
            {fiction.original_language ? (
              <>
                <dt className="text-muted-foreground">{t("sidebarOriginalLanguage")}</dt>
                <dd className="font-medium text-foreground">
                  {FICTION_LANGUAGE_LABELS[fiction.original_language as FictionLanguageCode] ?? fiction.original_language}
                </dd>
              </>
            ) : null}
          </dl>
        </div>
      </div>
    </div>
  )
}
