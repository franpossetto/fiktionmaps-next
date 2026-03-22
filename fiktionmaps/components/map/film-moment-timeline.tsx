"use client"

import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"
import { secondsFromTimecodeLabel } from "@/lib/scenes/scene-timecode"

/** Only when fiction has no duration in DB (UI fallback). */
const FALLBACK_DURATION_SEC = 2 * 60 * 60

function formatClock(totalSec: number): string {
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = Math.floor(totalSec % 60)
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
  return `${m}:${String(s).padStart(2, "0")}`
}

export interface FilmMomentTimelineProps {
  /** Scene moment from `timestamp_label` (exact). */
  timestampLabel: string | null | undefined
  /** Fiction total runtime (seconds). When missing, a fallback length is used for scale only. */
  durationSec?: number | null
  className?: string
  caption?: string
  /** When false, omit “set runtime on fiction” hint (e.g. modal). */
  showFallbackHint?: boolean
}

/**
 * Illustrative timeline: full bar = fiction duration; playhead = scene timecode (exact seconds).
 */
export function FilmMomentTimeline({
  timestampLabel,
  durationSec,
  className,
  caption,
  showFallbackHint = true,
}: FilmMomentTimelineProps) {
  const t = useTranslations("Map")
  const momentSec = secondsFromTimecodeLabel(timestampLabel)
  const totalSec =
    durationSec != null && durationSec > 0 ? durationSec : FALLBACK_DURATION_SEC
  const usingFallback = !(durationSec != null && durationSec > 0)

  const pct =
    momentSec == null
      ? null
      : Math.min(100, Math.max(0, (momentSec / totalSec) * 100))

  return (
    <div className={cn("space-y-1.5", className)}>
      {caption ? <p className="text-[10px] text-muted-foreground">{caption}</p> : null}
      {usingFallback && showFallbackHint ? (
        <p className="text-[10px] text-amber-600/90 dark:text-amber-400/90">{t("filmTimelineSetRuntime")}</p>
      ) : null}

      <div className="relative pt-0.5">
        <div
          className="relative h-1.5 w-full overflow-visible rounded-full bg-muted-foreground/25"
          role="img"
          aria-label={
            momentSec != null
              ? `Moment at ${formatClock(momentSec)} in a ${formatClock(totalSec)} work`
              : "Film timeline"
          }
        >
          {pct != null ? (
            <div
              className="absolute left-0 top-0 h-full rounded-full bg-primary/35"
              style={{ width: `${pct}%` }}
            />
          ) : null}
          {pct != null ? (
            <div
              className="absolute top-1/2 z-10 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-[#E50914] shadow-md ring-1 ring-black/20"
              style={{ left: `${pct}%` }}
            />
          ) : null}
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 text-[10px] tabular-nums text-muted-foreground">
        <span>0:00</span>
        {momentSec != null && timestampLabel?.trim() ? (
          <span className="font-semibold text-foreground">{timestampLabel.trim()}</span>
        ) : (
          <span className="text-muted-foreground/80">—</span>
        )}
        <span>{formatClock(totalSec)}</span>
      </div>
    </div>
  )
}
