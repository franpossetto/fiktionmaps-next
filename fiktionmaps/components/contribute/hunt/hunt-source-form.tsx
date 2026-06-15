"use client"

import { useState } from "react"
import { useRouter } from "@/i18n/navigation"
import type { FictionWithMedia } from "@/src/fictions/domain/fiction.entity"
import { addHuntSourceAction } from "@/src/hunts/infrastructure/next/hunt.actions"
import { ContributeFieldWrapper } from "@/components/contribute/contribute-field-wrapper"
import { cn } from "@/lib/utils"

const INPUT =
  "w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:opacity-50"

type HuntSourceFormProps = {
  fictions: FictionWithMedia[]
  onAdded?: () => void
}

export function HuntSourceForm({ fictions, onAdded }: HuntSourceFormProps) {
  const router = useRouter()
  const [fictionId, setFictionId] = useState<string | null>(null)
  const [contextLabel, setContextLabel] = useState("")
  const [useContextLabel, setUseContextLabel] = useState(false)
  const [search, setSearch] = useState("")
  const [url, setUrl] = useState("")
  const [researchNote, setResearchNote] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const filtered = search.trim()
    ? fictions.filter((f) => f.title.toLowerCase().includes(search.trim().toLowerCase()))
    : fictions

  const selectedFiction = fictions.find((f) => f.id === fictionId)

  const canSubmit = url.trim() && (useContextLabel ? contextLabel.trim() : fictionId)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await addHuntSourceAction({
        fictionId: useContextLabel ? null : fictionId,
        contextLabel: useContextLabel ? contextLabel.trim() : null,
        sourceUrl: url.trim(),
        researchNote: researchNote.trim() || undefined,
      })
      if (!res.success) {
        setError(res.error)
        return
      }
      setUrl("")
      setResearchNote("")
      setFictionId(null)
      setContextLabel("")
      setSearch("")
      router.refresh()
      onAdded?.()
    } catch {
      setError("Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Fiction / context label toggle */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setUseContextLabel(false)}
          className={cn(
            "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
            !useContextLabel
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80",
          )}
        >
          Existing fiction
        </button>
        <button
          type="button"
          onClick={() => setUseContextLabel(true)}
          className={cn(
            "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
            useContextLabel
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80",
          )}
        >
          New fiction (context label)
        </button>
      </div>

      {useContextLabel ? (
        <ContributeFieldWrapper
          label="Context label"
          hint="Temporary name for a fiction not yet in the database (e.g. 'Titanic')"
          required
        >
          <input
            type="text"
            value={contextLabel}
            onChange={(e) => setContextLabel(e.target.value)}
            placeholder="e.g. Titanic"
            required
            className={INPUT}
          />
        </ContributeFieldWrapper>
      ) : (
        <ContributeFieldWrapper label="Fiction" required>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search fiction..."
            className={cn(INPUT, "mb-2")}
          />
          <div className="max-h-48 space-y-0.5 overflow-y-auto rounded-xl border border-border p-2">
            {filtered.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">No fictions found</p>
            ) : (
              filtered.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFictionId(f.id)}
                  className={cn(
                    "w-full rounded-lg px-4 py-2 text-left text-sm transition-colors",
                    fictionId === f.id
                      ? "bg-primary/10 font-medium text-foreground"
                      : "text-muted-foreground hover:bg-muted/60",
                  )}
                >
                  {f.title}
                </button>
              ))
            )}
          </div>
          {selectedFiction && (
            <p className="mt-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              Selected: {selectedFiction.title}
            </p>
          )}
        </ContributeFieldWrapper>
      )}

      <ContributeFieldWrapper label="Source URL" required>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://..."
          required
          className={INPUT}
        />
      </ContributeFieldWrapper>

      <ContributeFieldWrapper label="Research note" hint="Optional note for moderators">
        <input
          type="text"
          value={researchNote}
          onChange={(e) => setResearchNote(e.target.value)}
          placeholder="e.g. Comprehensive fan-sourced list"
          className={INPUT}
        />
      </ContributeFieldWrapper>

      {error && (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading || !canSubmit}
        className="w-full rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-opacity disabled:opacity-40"
      >
        {loading ? "Adding…" : "Add source"}
      </button>
    </form>
  )
}
