"use client"

import { useMemo } from "react"
import { MapPin, Plus } from "lucide-react"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"
import { PlacesSidebarRow, SidebarCard } from "./profile-sidebar-sections"
import { useHomes } from "./homes-context"

/** Thumbnail — mismo slot que Places (40×40, rounded-lg). */
export function HomeCityPreview({ className }: { className?: string }) {
  const color = "text-blue-600 dark:text-blue-400"
  return (
    <div
      className={cn(
        "relative flex h-full w-full items-center justify-center overflow-hidden rounded-[inherit] bg-blue-50 dark:bg-[#1e3a5f]",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className={cn("absolute h-8 w-8 rounded-full border border-current opacity-10", color)} />
        <div className={cn("absolute h-5 w-5 rounded-full border border-current opacity-25", color)} />
      </div>
      <MapPin className={cn("relative z-10 h-4 w-4 drop-shadow", color)} />
    </div>
  )
}

export function HomesTimeline() {
  const t = useTranslations("Homes")
  const tProfile = useTranslations("Profile")
  const { homes, cityMap, loading, error: fetchError, openHomePicker } = useHomes()

  const currentHome = useMemo(() => homes.find((h) => !h.dateTo), [homes])
  const currentCity = currentHome ? cityMap.get(currentHome.cityId) : null
  const cityName = currentCity?.name ?? currentHome?.cityId ?? ""
  const countryLine = currentCity?.country?.trim()

  if (loading) {
    return (
      <SidebarCard title={tProfile("sidebarHome")}>
        <p className="px-3 py-3 text-sm text-muted-foreground animate-pulse">{t("loading")}</p>
      </SidebarCard>
    )
  }

  return (
    <SidebarCard
      title={tProfile("sidebarHome")}
      ctaLabel={currentHome && !fetchError ? t("changeHome") : undefined}
      onCtaClick={currentHome && !fetchError ? openHomePicker : undefined}
    >
      {fetchError ? (
        <p className="px-3 py-3 text-sm text-destructive">{fetchError}</p>
      ) : currentHome ? (
        <button
          type="button"
          onClick={openHomePicker}
          className="block w-full text-left transition-colors hover:bg-muted/30"
        >
          <PlacesSidebarRow
            title={cityName}
            subtitle={countryLine || null}
            leading={<HomeCityPreview className="h-full w-full" />}
          />
        </button>
      ) : (
        <button
          type="button"
          onClick={openHomePicker}
          className="flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-muted/30"
        >
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-border/70 bg-muted/40">
            <Plus className="h-4 w-4 text-muted-foreground" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{t("addHome")}</p>
            <p className="truncate text-xs text-muted-foreground">{t("addHomeHint")}</p>
          </div>
        </button>
      )}
    </SidebarCard>
  )
}
