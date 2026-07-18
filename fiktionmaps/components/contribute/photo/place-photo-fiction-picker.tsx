"use client"

import { useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import type { FictionWithMedia } from "@/src/fictions/domain/fiction.entity"
import { ContributeFieldWrapper } from "@/components/contribute/contribute-field-wrapper"
import { cn } from "@/lib/utils"

const INPUT_ROW =
  "w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"

type PlacePhotoFictionPickerProps = {
  fictions: FictionWithMedia[]
  fictionId: string
  onSelect: (fictionId: string) => void
  error?: string
  emptyListMessage?: "noFictionsWithPlaces" | "noFictionsApproved"
}

export function PlacePhotoFictionPicker({
  fictions,
  fictionId,
  onSelect,
  error,
  emptyListMessage = "noFictionsWithPlaces",
}: PlacePhotoFictionPickerProps) {
  const t = useTranslations("Contribute.photo")
  const [fictionSearch, setFictionSearch] = useState("")

  const filteredFictions = useMemo(() => {
    const q = fictionSearch.trim().toLowerCase()
    if (!q) return fictions
    return fictions.filter((f) => f.title.toLowerCase().includes(q))
  }, [fictionSearch, fictions])

  return (
    <div className="space-y-5">
      <input
        type="search"
        value={fictionSearch}
        onChange={(e) => setFictionSearch(e.target.value)}
        placeholder={t("fictionSearchPlaceholder")}
        className={INPUT_ROW}
      />
      <ContributeFieldWrapper label={t("stepFiction")} required error={error}>
        <div className="max-h-[min(50vh,22rem)] space-y-1 overflow-y-auto rounded-xl border border-border p-2">
          {fictions.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">{t(emptyListMessage)}</p>
          ) : filteredFictions.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">{t("noFictions")}</p>
          ) : (
            filteredFictions.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => onSelect(f.id)}
                className={cn(
                  "w-full rounded-lg px-4 py-3 text-left text-sm transition-colors",
                  fictionId === f.id ? "bg-primary/10 font-medium text-foreground" : "hover:bg-muted/60",
                )}
              >
                {f.title}
              </button>
            ))
          )}
        </div>
      </ContributeFieldWrapper>
    </div>
  )
}
