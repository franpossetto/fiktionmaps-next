"use client"

import { useMemo } from "react"
import { MapPin } from "lucide-react"
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
  const { homes, cityMap, loading, error: fetchError } = useHomes()

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
    <SidebarCard title={tProfile("sidebarHome")}>
      {fetchError ? (
        <p className="px-3 py-3 text-sm text-destructive">{fetchError}</p>
      ) : homes.length === 0 ? (
        <p className="px-3 py-3 text-sm text-muted-foreground">{t("noHomes")}</p>
      ) : !currentHome ? (
        <p className="px-3 py-3 text-sm text-muted-foreground">{t("noCurrent")}</p>
      ) : (
        <PlacesSidebarRow
          title={cityName}
          subtitle={countryLine || null}
          leading={<HomeCityPreview className="h-full w-full" />}
        />
      )}
    </SidebarCard>
  )
}
