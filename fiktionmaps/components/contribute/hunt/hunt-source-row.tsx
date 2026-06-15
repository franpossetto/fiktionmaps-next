"use client"

import { useState, useTransition } from "react"
import { useRouter } from "@/i18n/navigation"
import type { HuntSource } from "@/src/hunts/domain/hunt-source.entity"
import type { Hunt } from "@/src/hunts/domain/hunt.entity"
import {
  scrapeHuntSourceAction,
  deleteHuntSourceAction,
  createHuntAction,
} from "@/src/hunts/infrastructure/next/hunt.actions"
import { cn } from "@/lib/utils"
import { RefreshCw, Trash2, Zap, ExternalLink, Clock, CheckCircle2, XCircle } from "lucide-react"

type HuntSourceRowProps = {
  source: HuntSource
  recentHunts: Hunt[]
}

function ScrapeStatusBadge({ status }: { status: HuntSource["scrapeStatus"] }) {
  if (status === "ok")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
        <CheckCircle2 className="h-2.5 w-2.5" />
        Scraped
      </span>
    )
  if (status === "failed")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-medium text-destructive">
        <XCircle className="h-2.5 w-2.5" />
        Failed
      </span>
    )
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
      <Clock className="h-2.5 w-2.5" />
      Pending
    </span>
  )
}

export function HuntSourceRow({ source, recentHunts }: HuntSourceRowProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [scrapeError, setScrapeError] = useState<string | null>(null)
  const [huntError, setHuntError] = useState<string | null>(null)

  const hostname = (() => {
    try { return new URL(source.sourceUrl).hostname } catch { return source.sourceUrl }
  })()

  function handleScrape() {
    setScrapeError(null)
    startTransition(async () => {
      const res = await scrapeHuntSourceAction(source.id)
      if (!res.success) {
        setScrapeError(res.error)
        return
      }
      router.refresh()
    })
  }

  function handleHunt() {
    setHuntError(null)
    startTransition(async () => {
      const res = await createHuntAction(source.id)
      if (!res.success) {
        setHuntError(res.error)
        return
      }
      router.push(`/contribute/hunt/${res.data.id}/review`)
    })
  }

  function handleDelete() {
    if (!confirm("Delete this source? All associated hunts will be deleted too.")) return
    startTransition(async () => {
      await deleteHuntSourceAction(source.id)
      router.refresh()
    })
  }

  const canHunt = source.scrapeStatus === "ok"
  const label = source.contextLabel ?? source.fictionId ?? "Unknown"

  return (
    <div className={cn("rounded-xl border border-border bg-card p-4 space-y-3", isPending && "opacity-60")}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <ScrapeStatusBadge status={source.scrapeStatus} />
            {source.contextLabel && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                {source.contextLabel}
              </span>
            )}
          </div>
          <a
            href={source.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ExternalLink className="h-3 w-3 shrink-0" />
            <span className="truncate">{hostname}</span>
          </a>
          {source.researchNote && (
            <p className="text-xs text-muted-foreground/80">{source.researchNote}</p>
          )}
          {recentHunts.length > 0 && (
            <p className="text-[10px] text-muted-foreground">
              {recentHunts.length} hunt{recentHunts.length !== 1 ? "s" : ""} — last:{" "}
              <span className="capitalize">{recentHunts[0]?.status}</span>
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={handleScrape}
            disabled={isPending}
            title={source.scrapeStatus === "ok" ? "Re-scrape" : "Scrape"}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-40"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isPending && "animate-spin")} />
          </button>
          <button
            type="button"
            onClick={handleHunt}
            disabled={isPending || !canHunt}
            title="Run hunt (extract places)"
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-40"
          >
            <Zap className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            title="Delete source"
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-40"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {(scrapeError ?? huntError) && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {scrapeError ?? huntError}
        </p>
      )}

      {!canHunt && source.scrapeStatus === "pending" && (
        <p className="text-xs text-muted-foreground">
          Scrape this source before running a hunt.
        </p>
      )}
    </div>
  )
}
