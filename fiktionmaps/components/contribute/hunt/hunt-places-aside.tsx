"use client"

import { Check, Minus } from "lucide-react"
import { useTranslations } from "next-intl"
import type { HuntPlaceReviewed } from "@/src/hunts/domain/hunt.types"
import { effectivePlace } from "@/src/hunts/domain/hunt-place.helpers"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type HuntReviewStatus = "pending" | "approved" | "posted" | "skipped"

function StatusIndicator({ status }: { status: HuntReviewStatus }) {
  if (status === "posted") {
    return (
      <span
        className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border-2 border-sky-600 bg-sky-600 text-white dark:border-sky-500 dark:bg-sky-500"
        aria-hidden
      >
        <Check className="h-2.5 w-2.5" strokeWidth={3} />
      </span>
    )
  }
  if (status === "skipped") {
    return (
      <span
        className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border-2 border-muted-foreground/40 bg-muted text-muted-foreground"
        aria-hidden
      >
        <Minus className="h-2.5 w-2.5" strokeWidth={3} />
      </span>
    )
  }
  return (
    <span
      className={cn(
        "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border-2 transition-colors",
        status === "approved" && "border-emerald-600 bg-emerald-600 text-white dark:border-emerald-500 dark:bg-emerald-500",
        status === "pending" && "border-border bg-background",
      )}
      aria-hidden
    >
      {status === "approved" ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : null}
    </span>
  )
}

export interface HuntPlacesAsideProps {
  places: HuntPlaceReviewed[]
  activeIndex: number
  reviewState: Record<number, HuntReviewStatus>
  coordsAdjusted: (index: number) => boolean
  fictionTitle: string
  hunterNote?: string
  onHunterNoteChange?: (note: string) => void
  canEdit?: boolean
  inboxMode?: boolean
  getPostulateHref?: (index: number) => string | null
  onSelect: (index: number) => void
  onToggleApprove?: (index: number) => void
  onFinish?: () => void
  finishLabel?: string
  className?: string
}

const NOTE_TEXTAREA =
  "w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:opacity-60"

export function HuntPlacesAside({
  places,
  activeIndex,
  reviewState,
  coordsAdjusted,
  fictionTitle,
  hunterNote = "",
  onHunterNoteChange,
  canEdit = true,
  inboxMode = false,
  getPostulateHref,
  onSelect,
  onToggleApprove,
  onFinish,
  finishLabel,
  className,
}: HuntPlacesAsideProps) {
  const t = useTranslations("Contribute.huntReview")
  const shortlistedCount = places.filter((_, i) => reviewState[i] === "approved").length
  const postedCount = places.filter((_, i) => reviewState[i] === "posted").length

  return (
    <nav
      className={cn("ml-auto w-full min-w-0 max-w-full space-y-4 overflow-y-auto", className)}
      aria-label="Hunt locations"
    >
      <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {inboxMode ? t("inboxKicker", { fictionTitle }) : t("reviewKicker", { fictionTitle })}
      </p>

      {inboxMode && (
        <p className="text-xs leading-relaxed text-muted-foreground">{t("inboxHint")}</p>
      )}

      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            {t("locationsHeading")}
          </h2>
          <p className="shrink-0 text-[10px] text-muted-foreground">
            {inboxMode
              ? t("inboxProgress", { posted: postedCount, shortlisted: shortlistedCount })
              : `${shortlistedCount}/${places.length}`}
          </p>
        </div>
        <ol className="space-y-0.5">
          {places.map((reviewed, index) => {
            const place = effectivePlace(reviewed)
            const active = index === activeIndex
            const status = reviewState[index] ?? "pending"
            const isDuplicate = place.duplicate_of !== null
            const hasNote = Boolean(reviewed.review_note?.trim())
            const placeName = place.name || `Location ${index + 1}`
            const postulateHref = inboxMode ? getPostulateHref?.(index) ?? null : null

            return (
              <li key={`${place.name}-${index}`} aria-current={active ? "step" : undefined}>
                <div
                  className={cn(
                    "flex min-w-0 w-full items-start rounded-md text-xs sm:text-sm transition-colors duration-150",
                    active ? "bg-muted/80" : "",
                  )}
                >
                  {inboxMode ? (
                    <span className="mt-0.5 shrink-0 p-1.5">
                      <StatusIndicator status={status} />
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onToggleApprove?.(index)}
                      disabled={!onToggleApprove}
                      aria-label={status === "approved" ? `Unapprove ${placeName}` : `Approve ${placeName}`}
                      aria-pressed={status === "approved"}
                      className={cn(
                        "mt-0.5 shrink-0 rounded-l-md p-1.5",
                        onToggleApprove
                          ? "cursor-pointer hover:bg-muted/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          : "pointer-events-none cursor-default",
                      )}
                    >
                      <StatusIndicator status={status} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onSelect(index)}
                    className={cn(
                      "min-w-0 flex-1 rounded-r-md py-1.5 pl-0.5 pr-1.5 text-left",
                      active ? "text-foreground" : "text-muted-foreground",
                      "cursor-pointer hover:bg-muted/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    )}
                  >
                    <span className={cn("block truncate leading-snug", active && "font-medium")}>
                      {placeName}
                    </span>
                    <span className="mt-0.5 flex flex-wrap gap-1">
                      {status === "posted" && (
                        <span className="rounded bg-sky-100 px-1 py-px text-[10px] font-medium text-sky-800 dark:bg-sky-900/50 dark:text-sky-300">
                          {t("statusPosted")}
                        </span>
                      )}
                      {status === "skipped" && (
                        <span className="rounded bg-muted px-1 py-px text-[10px] font-medium text-muted-foreground">
                          {t("statusSkipped")}
                        </span>
                      )}
                      {inboxMode && status === "approved" && postulateHref && (
                        <span className="rounded bg-emerald-100 px-1 py-px text-[10px] font-medium text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">
                          {t("statusReady")}
                        </span>
                      )}
                      {isDuplicate && (
                        <span className="rounded bg-amber-100 px-1 py-px text-[10px] font-medium text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
                          dup
                        </span>
                      )}
                      {coordsAdjusted(index) && (
                        <span className="rounded bg-sky-100 px-1 py-px text-[10px] font-medium text-sky-800 dark:bg-sky-900/50 dark:text-sky-300">
                          pin
                        </span>
                      )}
                      {hasNote && (
                        <span className="rounded bg-violet-100 px-1 py-px text-[10px] font-medium text-violet-800 dark:bg-violet-900/50 dark:text-violet-300">
                          note
                        </span>
                      )}
                    </span>
                  </button>
                </div>
              </li>
            )
          })}
        </ol>
      </div>

      <div className="space-y-1.5 border-t border-border/40 pt-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          {t("huntNoteLabel")}
        </p>
        {canEdit && onHunterNoteChange ? (
          <>
            <textarea
              value={hunterNote}
              onChange={(e) => onHunterNoteChange(e.target.value)}
              placeholder={t("huntNotePlaceholder")}
              rows={3}
              maxLength={1000}
              className={NOTE_TEXTAREA}
            />
            <p className="text-[10px] text-muted-foreground">
              {shortlistedCount === 0 ? t("huntNoteRequiredHint") : t("huntNoteHint")}
            </p>
          </>
        ) : hunterNote.trim() ? (
          <p className="text-xs leading-relaxed text-foreground">{hunterNote}</p>
        ) : (
          <p className="text-xs text-muted-foreground">—</p>
        )}
      </div>

      {onFinish && (
        <div className="border-t border-border/40 pt-3">
          <Button type="button" size="sm" className="w-full" onClick={onFinish}>
            {finishLabel ??
              (shortlistedCount === 0 ? t("closeReviewAction") : t("closeReviewActionWithCount", { count: shortlistedCount }))}
          </Button>
        </div>
      )}
    </nav>
  )
}

/** Horizontal strip for viewports where the left rail is hidden. */
export function HuntPlacesMobileStrip({
  places,
  activeIndex,
  reviewState,
  fictionTitle,
  inboxMode = false,
  onSelect,
  className,
}: Pick<
  HuntPlacesAsideProps,
  "places" | "activeIndex" | "reviewState" | "fictionTitle" | "inboxMode" | "onSelect" | "className"
>) {
  const t = useTranslations("Contribute.huntReview")

  return (
    <div className={cn("min-[900px]:hidden space-y-3", className)}>
      <p className="px-1 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {inboxMode ? t("inboxKicker", { fictionTitle }) : t("reviewKicker", { fictionTitle })}
      </p>
      <div className="-mx-1 overflow-x-auto pb-1">
        <div className="flex gap-2 px-1">
          {places.map((reviewed, index) => {
            const place = effectivePlace(reviewed)
            const active = index === activeIndex
            const status = reviewState[index] ?? "pending"
            return (
              <button
                key={`${place.name}-chip-${index}`}
                type="button"
                onClick={() => onSelect(index)}
                className={cn(
                  "inline-flex max-w-[11rem] shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition-colors",
                  active
                    ? "border-foreground/30 bg-muted text-foreground"
                    : "border-border/60 text-muted-foreground",
                )}
              >
                <StatusIndicator status={status} />
                <span className="truncate">{place.name || `Location ${index + 1}`}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
