"use client"

import { useMemo, useState, useTransition } from "react"
import { useTranslations } from "next-intl"
import type { FictionWithMedia } from "@/src/fictions/domain/fiction.entity"
import type { HuntPlaceReviewed } from "@/src/hunts/domain/hunt.types"
import { assignFictionToHuntSourceAction } from "@/src/hunts/infrastructure/next/hunt.actions"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ContributeFieldWrapper } from "@/components/contribute/contribute-field-wrapper"
import { cn } from "@/lib/utils"

const INPUT_ROW =
  "w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"

type HuntAssignFictionDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  sourceId: string
  huntId: string
  fictions: FictionWithMedia[]
  contextLabel: string | null
  onAssigned: (data: { fictionId: string; fictionTitle: string; places: HuntPlaceReviewed[] }) => void
}

export function HuntAssignFictionDialog({
  open,
  onOpenChange,
  sourceId,
  huntId,
  fictions,
  contextLabel,
  onAssigned,
}: HuntAssignFictionDialogProps) {
  const t = useTranslations("Contribute.huntReview")
  const [fictionSearch, setFictionSearch] = useState("")
  const [selectedFictionId, setSelectedFictionId] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const filteredFictions = useMemo(() => {
    const q = fictionSearch.trim().toLowerCase()
    if (!q) return fictions
    return fictions.filter((f) => f.title.toLowerCase().includes(q))
  }, [fictionSearch, fictions])

  function handleConfirm() {
    if (!selectedFictionId) {
      setError(t("assignFictionRequired"))
      return
    }
    setError(null)
    startTransition(async () => {
      const res = await assignFictionToHuntSourceAction({
        sourceId,
        fictionId: selectedFictionId,
        huntId,
      })
      if (!res.success) {
        setError(res.error)
        return
      }
      onAssigned({
        fictionId: selectedFictionId,
        fictionTitle: res.data.fictionTitle,
        places: res.data.places,
      })
      onOpenChange(false)
      setSelectedFictionId("")
      setFictionSearch("")
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("assignFictionTitle")}</DialogTitle>
          <p className="text-sm text-muted-foreground">{t("assignFictionDescription")}</p>
          {contextLabel && (
            <p className="text-xs text-muted-foreground">
              {t("assignFictionLabelHint", { label: contextLabel })}
            </p>
          )}
        </DialogHeader>

        <div className="space-y-4">
          <input
            type="search"
            value={fictionSearch}
            onChange={(e) => setFictionSearch(e.target.value)}
            placeholder={t("assignFictionSearchPlaceholder")}
            className={INPUT_ROW}
          />
          <ContributeFieldWrapper label={t("assignFictionFieldLabel")} required error={error ?? undefined}>
            <div className="max-h-[min(50vh,18rem)] space-y-1 overflow-y-auto rounded-xl border border-border p-2">
              {filteredFictions.length === 0 ? (
                <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                  {t("assignFictionNoResults")}
                </p>
              ) : (
                filteredFictions.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => {
                      setSelectedFictionId(f.id)
                      setError(null)
                    }}
                    className={cn(
                      "w-full rounded-lg px-4 py-3 text-left text-sm transition-colors",
                      selectedFictionId === f.id
                        ? "bg-primary/10 font-medium text-foreground"
                        : "hover:bg-muted/60",
                    )}
                  >
                    {f.title}
                  </button>
                ))
              )}
            </div>
          </ContributeFieldWrapper>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            {t("assignFictionCancel")}
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={pending || !selectedFictionId}>
            {pending ? t("assignFictionSaving") : t("assignFictionConfirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
