"use client"

import type { LucideIcon } from "lucide-react"
import { BookOpen, Film, Music, Tv } from "lucide-react"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"

export type ContributeCategoryId = "music" | "book" | "movie" | "tv"

const CARD_META: { id: ContributeCategoryId; soon?: boolean; icon: LucideIcon }[] = [
  { id: "music", soon: true, icon: Music },
  { id: "book", icon: BookOpen },
  { id: "movie", icon: Film },
  { id: "tv", icon: Tv },
]

export interface FictionContributeCategoryPickerProps {
  selected: ContributeCategoryId | null
  onSelect: (id: ContributeCategoryId) => void
  error?: string | null
  className?: string
}

export function FictionContributeCategoryPicker({
  selected,
  onSelect,
  error,
  className,
}: FictionContributeCategoryPickerProps) {
  const t = useTranslations("Contribute.categoryPicker")

  return (
    <div className={cn("w-full", className)}>
      <div className="mx-auto max-w-xl text-center">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{t("title")}</h1>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">{t("subtitle")}</p>
      </div>

      <div className="mx-auto mt-8 grid max-w-xl grid-cols-2 gap-3 sm:mt-10 sm:gap-4">
        {CARD_META.map(({ id, soon, icon: Icon }) => {
          const isSelected = selected === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelect(id)}
              className={cn(
                "relative flex flex-col items-center gap-3 rounded-2xl border bg-card px-4 py-6 text-center transition-[border-color,box-shadow,background-color]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                isSelected
                  ? "border-2 border-foreground shadow-sm"
                  : "border border-border hover:border-foreground/25 hover:bg-muted/30",
              )}
            >
              {soon ? (
                <span className="absolute right-2 top-2 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  {t("soon")}
                </span>
              ) : null}
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/80 text-foreground">
                <Icon className="h-7 w-7" aria-hidden />
              </span>
              <span className="text-sm font-semibold text-foreground">{t(id)}</span>
            </button>
          )
        })}
      </div>

      {error ? (
        <p className="mt-6 text-center text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
