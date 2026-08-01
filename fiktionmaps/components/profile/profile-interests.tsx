"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { Check, Pencil, Search } from "lucide-react"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"
import type { InterestCatalogItem } from "@/src/interests"
import { setMyInterestsAction } from "@/src/users/infrastructure/next/user.actions"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export type ProfileInterestTag = { id: string; label: string }

const MAX_INTERESTS = 10

type ProfileInterestsProps = {
  initialSelected: ProfileInterestTag[]
  catalog?: InterestCatalogItem[]
  canEdit?: boolean
  onSaved?: (selected: ProfileInterestTag[]) => void
}

export function ProfileInterests({
  initialSelected,
  catalog = [],
  canEdit = false,
  onSaved,
}: ProfileInterestsProps) {
  const t = useTranslations("Profile")
  const [selected, setSelected] = useState(initialSelected)
  const [draftIds, setDraftIds] = useState(() => initialSelected.map((item) => item.id))
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    setSelected(initialSelected)
  }, [initialSelected])

  useEffect(() => {
    if (!open) return
    setDraftIds(selected.map((item) => item.id))
    setQuery("")
    setError(null)
  }, [open, selected])

  const filteredCatalog = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return catalog
    return catalog.filter(
      (item) =>
        item.label.toLowerCase().includes(q) || item.key.toLowerCase().includes(q),
    )
  }, [catalog, query])

  if (!canEdit && selected.length === 0) return null

  const toggleDraft = (interestId: string) => {
    setDraftIds((prev) => {
      if (prev.includes(interestId)) return prev.filter((id) => id !== interestId)
      if (prev.length >= MAX_INTERESTS) return prev
      return [...prev, interestId]
    })
  }

  const onSave = () => {
    startTransition(async () => {
      setError(null)
      const result = await setMyInterestsAction(draftIds)
      if (!result.success) {
        setError(result.error || t("interestsSaveError"))
        return
      }
      const labelById = new Map(catalog.map((item) => [item.id, item.label]))
      const nextSelected = draftIds.flatMap((id) => {
        const label = labelById.get(id)
        return label != null ? [{ id, label }] : []
      })
      setSelected(nextSelected)
      onSaved?.(nextSelected)
      setOpen(false)
    })
  }

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {t("interestsHeading")}
        </h2>
        {canEdit ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-md p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            aria-label={t("editInterests")}
            title={t("editInterests")}
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden />
          </button>
        ) : null}
      </div>

      {selected.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5">
          {selected.slice(0, MAX_INTERESTS).map(({ id, label }) => (
            <li
              key={id}
              className="flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[11px] font-medium leading-tight text-muted-foreground"
            >
              <Check className="h-2.5 w-2.5 shrink-0 text-foreground" aria-hidden />
              {label}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs leading-relaxed text-muted-foreground">{t("noInterests")}</p>
      )}

      {canEdit ? (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-h-[90vh] gap-0 overflow-hidden p-0 sm:max-w-2xl">
            <DialogHeader className="border-b border-border/60 px-6 py-5">
              <DialogTitle className="text-lg">{t("editInterestsTitle")}</DialogTitle>
              <p className="text-sm text-muted-foreground">
                {t("editInterestsHint", { max: MAX_INTERESTS })}
              </p>
            </DialogHeader>

            <div className="space-y-4 px-6 py-5">
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("interestsSearchPlaceholder")}
                  className="h-10 pl-9 text-sm"
                  autoFocus
                />
              </div>

              <p className="text-xs tabular-nums text-muted-foreground">
                <span className="font-semibold text-foreground">{draftIds.length}</span>/
                {MAX_INTERESTS}
              </p>

              {catalog.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("noInterestsCatalog")}</p>
              ) : filteredCatalog.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("interestsSearchEmpty")}</p>
              ) : (
                <div className="flex max-h-[min(28rem,55vh)] flex-wrap content-start gap-1.5 overflow-y-auto pr-1">
                  {filteredCatalog.map((interest) => {
                    const active = draftIds.includes(interest.id)
                    const atMax = !active && draftIds.length >= MAX_INTERESTS
                    return (
                      <button
                        key={interest.id}
                        type="button"
                        onClick={() => toggleDraft(interest.id)}
                        disabled={atMax}
                        aria-pressed={active}
                        title={interest.key}
                        className={cn(
                          "flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors",
                          active && "border-border/80 text-foreground",
                          atMax && "opacity-40",
                        )}
                      >
                        <span className="inline-flex h-2.5 w-2.5 items-center justify-center">
                          <Check
                            className={cn(
                              "h-2.5 w-2.5 text-foreground transition-opacity",
                              active ? "opacity-100" : "opacity-0",
                            )}
                            aria-hidden
                          />
                        </span>
                        {interest.label}
                      </button>
                    )
                  })}
                </div>
              )}

              {error ? <p className="text-sm text-destructive">{error}</p> : null}
            </div>

            <DialogFooter className="border-t border-border/60 px-6 py-4 sm:justify-between">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
                disabled={isPending}
              >
                {t("cancelEdit")}
              </Button>
              <Button type="button" onClick={onSave} disabled={isPending}>
                {isPending ? t("savingPersonalInfo") : t("savePersonalInfo")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </section>
  )
}
