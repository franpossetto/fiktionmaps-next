"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "@/i18n/navigation"
import { useTranslations } from "next-intl"
import { CheckCircle2, ChevronDown, Clock, ExternalLink, Plus, XCircle } from "lucide-react"
import type { FictionWithMedia } from "@/src/fictions/domain/fiction.entity"
import type { HuntSource } from "@/src/hunts/domain/hunt-source.entity"
import type { Hunt } from "@/src/hunts/domain/hunt.entity"
import {
  addHuntSourceAction,
  scrapeHuntSourceAction,
  createHuntAction,
  deleteHuntSourceAction,
} from "@/src/hunts/infrastructure/next/hunt.actions"
import { FictionContributeLayout } from "@/components/contribute/fiction/fiction-contribute-layout"
import { ContributionWizardShell } from "@/components/contribute/contribution-wizard-shell"
import { ContributeStepHeader } from "@/components/contribute/contribute-step-header"
import { ContributeFieldWrapper } from "@/components/contribute/contribute-field-wrapper"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { HuntSourceStepsAside } from "./hunt-source-steps-aside"
import { HuntSectionNav } from "./hunt-section-nav"
import { cn } from "@/lib/utils"
import { normalizeHuntSourceUrl } from "@/src/hunts/domain/hunt-source.helpers"

const INPUT =
  "h-11 w-full shrink-0 rounded-xl border border-border bg-card px-4 text-sm outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground focus:ring-2 focus:ring-foreground/20 disabled:opacity-50"

const TOTAL_STEPS = 2
type Step = 1 | 2

type HuntContext =
  | { kind: "fiction"; fictionId: string }
  | { kind: "label"; label: string }

type ContextListItem =
  | { kind: "fiction"; id: string; title: string }
  | { kind: "label"; label: string; normalized: string }

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeTitle(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ")
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60_000)
  if (min < 60) return `${min}m ago`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return new Date(iso).toLocaleDateString("en", { month: "short", day: "numeric" })
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

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

type SourceTableRowProps = {
  source: HuntSource
  recentHunts: Hunt[]
  onRefresh: () => void
  onHunt: (huntId: string) => void
}

function HuntStatusBadge({ status }: { status: Hunt["status"] }) {
  const map: Record<Hunt["status"], string> = {
    draft: "bg-muted text-muted-foreground",
    in_review: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    submitted: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
    approved: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
    rejected: "bg-destructive/10 text-destructive",
  }
  const labels: Record<Hunt["status"], string> = {
    draft: "Draft", in_review: "In review", submitted: "Submitted",
    approved: "Approved", rejected: "Rejected",
  }
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", map[status])}>
      {labels[status]}
    </span>
  )
}

function SourceTableRow({ source, recentHunts, onRefresh, onHunt }: SourceTableRowProps) {
  const [pending, startTransition] = useTransition()
  const [rowError, setRowError] = useState<string | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const hostname = (() => {
    try { return new URL(source.sourceUrl).hostname } catch { return source.sourceUrl }
  })()

  const lastScrape = source.scrapeStatus !== "pending" ? formatRelative(source.updatedAt) : "—"
  const lastHunt = recentHunts[0] ? formatRelative(recentHunts[0].createdAt) : "—"
  const totalPlaces = recentHunts.reduce((sum, h) => sum + (h.stats.approved ?? 0), 0)

  function handleScrape() {
    setRowError(null)
    startTransition(async () => {
      const res = await scrapeHuntSourceAction(source.id)
      if (!res.success) { setRowError(res.error); return }
      onRefresh()
    })
  }

  function handleHunt() {
    setRowError(null)
    startTransition(async () => {
      const res = await createHuntAction(source.id)
      if (!res.success) { setRowError(res.error); return }
      onHunt(res.data.id)
    })
  }

  function handleDelete() {
    if (!confirm("Delete this source? All associated hunts will be deleted too.")) return
    startTransition(async () => {
      await deleteHuntSourceAction(source.id)
      onRefresh()
    })
  }

  const outcomeLabel: Record<string, string> = {
    places_created: "Places created",
    partial: "Partial",
    no_value: "No value",
    failed_pipeline: "Failed pipeline",
  }

  return (
    <>
      <tr
        onClick={() => setDetailOpen(true)}
        className={cn(
          "border-b border-border/50 last:border-0 cursor-pointer transition-colors hover:bg-muted/40",
          pending && "opacity-50",
        )}
      >
        <td className="py-3 pr-4">
          <a
            href={source.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1.5 text-sm text-foreground hover:underline"
          >
            <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
            <span className="max-w-[260px] truncate">{hostname}</span>
          </a>
          {source.researchNote && (
            <p className="mt-0.5 max-w-[260px] truncate text-xs text-muted-foreground/70">
              {source.researchNote}
            </p>
          )}
        </td>
        <td className="py-3 pr-4">
          <ScrapeStatusBadge status={source.scrapeStatus} />
        </td>
        <td className="py-3 pr-4 text-xs tabular-nums text-muted-foreground">{lastScrape}</td>
        <td className="py-3 pr-4 text-xs tabular-nums text-muted-foreground">{lastHunt}</td>
        <td className="py-3 pr-4 text-sm tabular-nums text-muted-foreground">
          {totalPlaces > 0 ? totalPlaces : "—"}
        </td>
        <td className="py-3" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                disabled={pending}
                className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
              >
                Actions
                <ChevronDown className="h-3 w-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleScrape}>Run scrape</DropdownMenuItem>
              <DropdownMenuItem onClick={handleHunt} disabled={source.scrapeStatus !== "ok"}>
                Run hunt
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleDelete} className="text-destructive focus:text-destructive">
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </td>
      </tr>

      {rowError && (
        <tr>
          <td colSpan={6} className="pb-2">
            <p className="text-xs text-destructive">{rowError}</p>
          </td>
        </tr>
      )}

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
              <a
                href={source.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate hover:underline"
              >
                {hostname}
              </a>
            </DialogTitle>
          </DialogHeader>

          {recentHunts.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No hunts yet for this source.</p>
          ) : (
            <div className="mt-2 overflow-hidden rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/40">
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Date</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Extracted</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Approved</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Outcome</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Model</th>
                    <th className="px-4 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {recentHunts.map((hunt) => (
                    <tr key={hunt.id} className="border-b border-border/50 last:border-0">
                      <td className="px-4 py-2.5"><HuntStatusBadge status={hunt.status} /></td>
                      <td className="px-4 py-2.5 text-xs tabular-nums text-muted-foreground">
                        {formatRelative(hunt.createdAt)}
                      </td>
                      <td className="px-4 py-2.5 text-xs tabular-nums text-muted-foreground">
                        {hunt.stats.extracted ?? "—"}
                      </td>
                      <td className="px-4 py-2.5 text-xs tabular-nums text-muted-foreground">
                        {hunt.stats.approved ?? "—"}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">
                        {hunt.outcome ? (outcomeLabel[hunt.outcome] ?? hunt.outcome) : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">
                        {hunt.stats.llm_model ?? "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        <a
                          href={`/contribute/hunt/${hunt.id}/review`}
                          className="text-xs font-medium text-primary hover:underline"
                        >
                          Review
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

// ---------------------------------------------------------------------------
// Add-source popover form
// ---------------------------------------------------------------------------

type AddSourcePopoverProps = {
  context: HuntContext
  existingSources: HuntSource[]
  onAdded: () => void
}

function AddSourcePopover({ context, existingSources, onAdded }: AddSourcePopoverProps) {
  const tNew = useTranslations("Contribute.huntNew")
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState("")
  const [researchNote, setResearchNote] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleClose() {
    setOpen(false)
    setUrl("")
    setResearchNote("")
    setError(null)
  }

  async function handleSubmit() {
    setError(null)
    const trimmedUrl = url.trim()
    if (!trimmedUrl) return

    const normalized = normalizeHuntSourceUrl(trimmedUrl)
    const duplicate = existingSources.find((s) => s.sourceUrlNormalized === normalized)
    if (duplicate) {
      setError(tNew("urlAlreadyExists"))
      return
    }

    setLoading(true)
    try {
      const res = await addHuntSourceAction({
        fictionId: context.kind === "fiction" ? context.fictionId : null,
        contextLabel: context.kind === "label" ? context.label.trim() : null,
        sourceUrl: url.trim(),
        researchNote: researchNote.trim() || undefined,
      })
      if (!res.success) { setError(res.error); return }
      handleClose()
      onAdded()
    } catch {
      setError("Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={(v) => { if (!v) handleClose(); else setOpen(true) }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Add source
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 space-y-4 p-4">
        <p className="text-sm font-semibold text-foreground">Add source</p>
        <ContributeFieldWrapper label="Source URL" required>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://…"
            className={INPUT}
            autoFocus
          />
        </ContributeFieldWrapper>
        <ContributeFieldWrapper label="Research note" hint="Optional">
          <input
            type="text"
            value={researchNote}
            onChange={(e) => setResearchNote(e.target.value)}
            placeholder="e.g. Comprehensive fan-sourced list"
            className={INPUT}
          />
        </ContributeFieldWrapper>
        {error && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </p>
        )}
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!url.trim() || loading}
            className="rounded-lg bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground transition-opacity disabled:opacity-40"
          >
            {loading ? "Adding…" : "Add"}
          </button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

// ---------------------------------------------------------------------------
// Main wizard
// ---------------------------------------------------------------------------

type HuntSourceWizardProps = {
  fictions: FictionWithMedia[]
  sources: HuntSource[]
  huntsBySource: Record<string, Hunt[]>
}

export function HuntSourceWizard({ fictions, sources, huntsBySource }: HuntSourceWizardProps) {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedContext, setSelectedContext] = useState<HuntContext | null>(null)
  const [labelConfirmOpen, setLabelConfirmOpen] = useState(false)
  const [pendingLabel, setPendingLabel] = useState<string | null>(null)

  const existingLabels = useMemo(() => {
    const byNormalized = new Map<string, string>()
    for (const source of sources) {
      if (!source.contextLabel || source.fictionId) continue
      const normalized = normalizeTitle(source.contextLabel)
      if (!byNormalized.has(normalized)) {
        byNormalized.set(normalized, source.contextLabel)
      }
    }
    return Array.from(byNormalized.entries())
      .map(([normalized, label]) => ({ normalized, label }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [sources])

  const query = searchQuery.trim()
  const normalizedQuery = normalizeTitle(query)

  const filteredItems = useMemo((): ContextListItem[] => {
    const q = query.toLowerCase()
    const fictionItems: ContextListItem[] = (q
      ? fictions.filter((f) => f.title.toLowerCase().includes(q))
      : fictions
    ).map((f) => ({ kind: "fiction", id: f.id, title: f.title }))

    const labelItems: ContextListItem[] = (q
      ? existingLabels.filter((l) => l.label.toLowerCase().includes(q))
      : existingLabels
    ).map((l) => ({ kind: "label", label: l.label, normalized: l.normalized }))

    return [...fictionItems, ...labelItems].sort((a, b) => {
      const titleA = a.kind === "fiction" ? a.title : a.label
      const titleB = b.kind === "fiction" ? b.title : b.label
      return titleA.localeCompare(titleB)
    })
  }, [fictions, existingLabels, query])

  const exactFiction = useMemo(
    () => fictions.find((f) => normalizeTitle(f.title) === normalizedQuery) ?? null,
    [fictions, normalizedQuery],
  )
  const exactLabel = useMemo(
    () => existingLabels.find((l) => l.normalized === normalizedQuery) ?? null,
    [existingLabels, normalizedQuery],
  )
  const hasFilteredResults = filteredItems.length > 0

  const step1Valid =
    selectedContext !== null ||
    exactFiction !== null ||
    exactLabel !== null ||
    (query.length > 0 && exactFiction === null && !hasFilteredResults)

  const activeContext = selectedContext

  const relevantSources = useMemo(() => {
    if (!activeContext) return []
    return sources.filter((s) => {
      if (activeContext.kind === "fiction") return s.fictionId === activeContext.fictionId
      return (
        s.contextLabel !== null &&
        normalizeTitle(s.contextLabel) === normalizeTitle(activeContext.label)
      )
    })
  }, [sources, activeContext])

  const contextName =
    activeContext?.kind === "fiction"
      ? (fictions.find((f) => f.id === activeContext.fictionId)?.title ?? "")
      : (activeContext?.kind === "label" ? activeContext.label : "")

  function handleSearchChange(value: string) {
    setSearchQuery(value)
    setSelectedContext(null)
  }

  function selectFiction(id: string) {
    const fiction = fictions.find((f) => f.id === id)
    if (!fiction) return
    setSelectedContext({ kind: "fiction", fictionId: id })
    setSearchQuery(fiction.title)
  }

  function selectLabel(label: string) {
    setSelectedContext({ kind: "label", label })
    setSearchQuery(label)
  }

  function handleStep1Next() {
    if (selectedContext?.kind === "fiction" || exactFiction) {
      setSelectedContext(
        selectedContext ?? { kind: "fiction", fictionId: exactFiction!.id },
      )
      setStep(2)
      return
    }

    if (selectedContext?.kind === "label") {
      setStep(2)
      return
    }

    if (exactLabel) {
      setSelectedContext({ kind: "label", label: exactLabel.label })
      setStep(2)
      return
    }

    if (query.length > 0 && exactFiction === null) {
      setPendingLabel(query)
      setLabelConfirmOpen(true)
    }
  }

  function confirmNewLabel() {
    if (!pendingLabel?.trim()) return
    setSelectedContext({ kind: "label", label: pendingLabel.trim() })
    setPendingLabel(null)
    setLabelConfirmOpen(false)
    setStep(2)
  }

  const stepTitles: Record<Step, string> = {
    1: "Fiction",
    2: "Sources",
  }

  const stepDescriptions: Record<Step, string> = {
    1: "Search for a fiction in the database, pick an existing label, or create a new label if the title is not listed yet.",
    2: contextName ? `Sources for "${contextName}".` : "Sources for this fiction.",
  }

  const leftAside = <HuntSourceStepsAside step={step} className="py-1 min-[900px]:pl-1" />

  return (
    <FictionContributeLayout leftAside={leftAside} rightAside={null} mainColumnScroll={false}>
      <ContributionWizardShell
        stepIndex={step - 1}
        totalSteps={TOTAL_STEPS}
        contentMaxWidthClassName="max-w-full"
        contentInnerClassName="h-full flex flex-col"
        footerNav={{
          showBack: step > 1,
          onBack: () => setStep(1),
          isLastStep: false,
          onNext: step === 1 ? handleStep1Next : () => setStep(1),
          onSubmit: () => {},
          nextLabel: step === 1 ? "Next" : "Done",
          disabled: step === 1 ? !step1Valid : false,
          showTrailingArrow: step === 1,
        }}
      >
        <HuntSectionNav />

        {step === 1 ? (
          <ContributeStepHeader
            title={stepTitles[step]}
            description={stepDescriptions[step]}
            badge="required"
            stepNumber={step}
            totalSteps={TOTAL_STEPS}
            variant="minimal"
          />
        ) : (
          <div className="mb-5 flex items-start justify-between gap-4 sm:mb-6">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {stepTitles[step]}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                {stepDescriptions[step]}
              </p>
            </div>
            {activeContext && (
              <AddSourcePopover
                context={activeContext}
                existingSources={relevantSources}
                onAdded={() => router.refresh()}
              />
            )}
          </div>
        )}

        {/* ── Step 1: fiction / label ── */}
        {step === 1 && (
          <div className="flex flex-1 min-h-0 flex-col gap-y-1.5">
            <label className="shrink-0 block text-sm font-semibold leading-snug text-foreground">
              Fiction or label<span className="ml-0.5 text-destructive">*</span>
            </label>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search fiction or label…"
              className={cn(INPUT, "shrink-0")}
            />
            <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto rounded-xl border border-border p-2">
              {filteredItems.length === 0 ? (
                <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                  {query
                    ? "No matches. Press Next to create a new label."
                    : "No fictions or labels yet."}
                </p>
              ) : (
                filteredItems.map((item) => {
                  const isSelected =
                    item.kind === "fiction"
                      ? selectedContext?.kind === "fiction" &&
                        selectedContext.fictionId === item.id
                      : selectedContext?.kind === "label" &&
                        normalizeTitle(selectedContext.label) === item.normalized

                  const title = item.kind === "fiction" ? item.title : item.label

                  return (
                    <button
                      key={item.kind === "fiction" ? `fiction-${item.id}` : `label-${item.normalized}`}
                      type="button"
                      onClick={() =>
                        item.kind === "fiction"
                          ? selectFiction(item.id)
                          : selectLabel(item.label)
                      }
                      className={cn(
                        "flex w-full items-center gap-2 rounded-lg px-4 py-2 text-left text-sm transition-colors",
                        isSelected
                          ? "bg-primary/10 font-medium text-foreground"
                          : "text-muted-foreground hover:bg-muted/60",
                      )}
                    >
                      <span className="min-w-0 flex-1 truncate">{title}</span>
                      <Badge
                        variant={item.kind === "fiction" ? "default" : "secondary"}
                        className="shrink-0 px-2 py-0 text-[10px] font-medium"
                      >
                        {item.kind === "fiction" ? "Fiction" : "Label"}
                      </Badge>
                    </button>
                  )
                })
              )}
            </div>
            {selectedContext && (
              <p className="shrink-0 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                Selected: {contextName}
              </p>
            )}
          </div>
        )}

        {/* ── Step 2: sources table ── */}
        {step === 2 && (
          <div className="space-y-4">
            {relevantSources.length === 0 ? (
              <p className="text-sm text-muted-foreground">No sources yet. Add the first one.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="pb-2 text-left text-xs font-medium text-muted-foreground">URL</th>
                    <th className="pb-2 text-left text-xs font-medium text-muted-foreground">Status</th>
                    <th className="pb-2 text-left text-xs font-medium text-muted-foreground">Last scrape</th>
                    <th className="pb-2 text-left text-xs font-medium text-muted-foreground">Last hunt</th>
                    <th className="pb-2 text-left text-xs font-medium text-muted-foreground">Places</th>
                    <th className="pb-2" />
                  </tr>
                </thead>
                <tbody>
                  {relevantSources.map((source) => (
                    <SourceTableRow
                      key={source.id}
                      source={source}
                      recentHunts={huntsBySource[source.id] ?? []}
                      onRefresh={() => router.refresh()}
                      onHunt={(huntId) => router.push(`/contribute/hunt/${huntId}/review`)}
                    />
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </ContributionWizardShell>

      <Dialog
        open={labelConfirmOpen}
        onOpenChange={(open) => {
          setLabelConfirmOpen(open)
          if (!open) setPendingLabel(null)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create context label</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            &ldquo;{pendingLabel}&rdquo; is not in the database yet. You will work under a temporary
            label until this fiction is added. Sources and hunts will be grouped under this name.
          </p>
          <DialogFooter>
            <button
              type="button"
              onClick={() => {
                setLabelConfirmOpen(false)
                setPendingLabel(null)
              }}
              className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmNewLabel}
              className="rounded-lg bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Create label
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </FictionContributeLayout>
  )
}
