"use client"

import { MapPinOff } from "lucide-react"
import { useTranslations } from "next-intl"

export function FictionDetailPlacesEmpty() {
  const t = useTranslations("Fictions")

  return (
    <div
      className="flex items-center gap-3 rounded-xl border border-border/40 bg-muted/30 px-4 py-6 sm:px-5 sm:py-8"
      role="status"
    >
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-background/80 text-muted-foreground shadow-sm ring-1 ring-border/50"
        aria-hidden
      >
        <MapPinOff className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-sm font-medium leading-snug text-foreground">{t("fictionDetailPlacesEmptyTitle")}</p>
        <p className="text-xs leading-relaxed text-muted-foreground">{t("fictionDetailPlacesEmptyDescription")}</p>
      </div>
    </div>
  )
}
