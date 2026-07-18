"use client"

import { useState, useMemo } from "react"
import type { FictionWithMedia } from "@/src/fictions/domain/fiction.entity"
import { previewHuntAction } from "@/src/hunts/infrastructure/next/hunt.actions"
import { ContributeFieldWrapper } from "@/components/contribute/contribute-field-wrapper"
import { useRouter } from "@/i18n/navigation"
import { cn } from "@/lib/utils"

export const HUNT_RESULT_SESSION_KEY = "hunt-pending-result"

const INPUT =
  "w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:opacity-50"

type HuntFormProps = {
  fictions: FictionWithMedia[]
}

export function HuntForm({ fictions }: HuntFormProps) {
  const router = useRouter()
  const [fictionId, setFictionId] = useState("")
  const [url, setUrl] = useState("")
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return fictions
    return fictions.filter((f) => f.title.toLowerCase().includes(q))
  }, [fictions, search])

  const selectedFiction = fictions.find((f) => f.id === fictionId)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await previewHuntAction({ source_url: url, fiction_id: fictionId })
      if (!res.success) {
        setError(res.error)
        return
      }
      sessionStorage.setItem(
        HUNT_RESULT_SESSION_KEY,
        JSON.stringify({ result: res.data, fictionTitle: selectedFiction?.title ?? "" }),
      )
      router.push("/contribute/hunt/confirm")
    } catch {
      setError("Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <ContributeFieldWrapper label="Fiction" required>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search fiction..."
          className={cn(INPUT, "mb-2")}
        />
        <div className="max-h-56 space-y-1 overflow-y-auto rounded-xl border border-border p-2">
          {filtered.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">No fictions found</p>
          ) : (
            filtered.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFictionId(f.id)}
                className={cn(
                  "w-full rounded-lg px-4 py-2.5 text-left text-sm transition-colors",
                  fictionId === f.id
                    ? "bg-primary/10 font-medium text-foreground"
                    : "hover:bg-muted/60 text-muted-foreground",
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

      {error && (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading || !fictionId || !url}
        className="w-full rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-opacity disabled:opacity-40"
      >
        {loading ? "Hunting…" : "Hunt"}
      </button>

      {loading && (
        <p className="text-center text-xs text-muted-foreground">
          Scraping the page and running AI extraction — this may take 15–20 seconds.
        </p>
      )}
    </form>
  )
}
