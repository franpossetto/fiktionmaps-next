"use client"

import { useState, useEffect, useMemo } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "@/i18n/navigation"
import { useThemeSettings } from "@/lib/theme-settings-context"
import type { ThemeBase, StyleVariant, TimeOfDay } from "@/lib/theme-settings"
import type { ThemeSettings } from "@/lib/theme-settings"
import { Button } from "@/components/ui/button"
import { AppDetailRailsShell } from "@/components/layout/app-detail-rails-shell"
import { SettingsNav } from "./settings-nav"
import {
  SETTINGS_SECTION_IDS,
  type SettingsNavItem,
  type SettingsSectionId,
} from "./settings-sections"
import { SettingsSectionPanel } from "./settings-section-panels"
import mapDay from "@/lib/map/styles/mapbox_day.png"
import mapDawn from "@/lib/map/styles/mapbox_dawn.png"
import mapDusk from "@/lib/map/styles/mapbox_dusk.png"
import mapNight from "@/lib/map/styles/mapbox_night.png"

type MapStyleOption = "day" | "dawn" | "night" | "dusk"

export function SettingsPage() {
  const t = useTranslations("Settings")
  const router = useRouter()
  const { settings, applyAndSave, timeOfDay } = useThemeSettings()
  const [pending, setPending] = useState<ThemeSettings>(settings)
  const [activeSection, setActiveSection] = useState<SettingsSectionId>("appearance")

  const navItems = useMemo<SettingsNavItem[]>(
    () =>
      SETTINGS_SECTION_IDS.map((id) => ({
        id,
        label: t(`sections.${id}.nav`),
      })),
    [t],
  )

  const mapStyleOptions = useMemo<
    {
      id: MapStyleOption
      label: string
      base: ThemeBase
      variant: StyleVariant
      image: typeof mapDay
    }[]
  >(
    () => [
      { id: "day", label: t("day"), base: "light", variant: "1", image: mapDay },
      { id: "dawn", label: t("dawn"), base: "light", variant: "2", image: mapDawn },
      { id: "night", label: t("night"), base: "dark", variant: "1", image: mapNight },
      { id: "dusk", label: t("dusk"), base: "dark", variant: "2", image: mapDusk },
    ],
    [t],
  )

  const timeOfDayLabels = useMemo<Record<TimeOfDay, string>>(
    () => ({
      day: t("day"),
      afternoon: t("afternoon"),
      evening: t("evening"),
      night: t("night"),
    }),
    [t],
  )

  useEffect(() => {
    setPending(settings)
  }, [
    settings.mode,
    settings.base,
    settings.styleVariant,
    settings.marker2dShape,
    settings.markerLabelMode,
    settings.markerHoverScale,
  ])

  useEffect(() => {
    if (!navItems.some((item) => item.id === activeSection)) {
      setActiveSection("appearance")
    }
  }, [navItems, activeSection])

  const handleSave = () => {
    applyAndSave(pending)
    router.back()
  }

  const markerPreviewThemeBase: ThemeBase =
    pending.mode === "manual"
      ? pending.base
      : timeOfDay === "day" || timeOfDay === "afternoon"
        ? "light"
        : "dark"

  const now = new Date()
  const localTime = now.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
  const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone

  const mapPreviewByTimeOfDay =
    timeOfDay === "day"
      ? mapDay
      : timeOfDay === "afternoon"
        ? mapDawn
        : timeOfDay === "evening"
          ? mapDusk
          : mapNight

  const panelProps = {
    sectionId: activeSection,
    pending,
    setPending,
    markerPreviewThemeBase,
    timeOfDay,
    mapStyleOptions,
    mapPreviewByTimeOfDay,
    localTime,
    localTz,
    timeOfDayLabels,
  }

  return (
    <AppDetailRailsShell
      leftAside={
        <div className="sticky top-0 py-10 pr-3">
          <SettingsNav
            items={navItems}
            activeId={activeSection}
            onSelect={setActiveSection}
          />
        </div>
      }
    >
      <div className="flex h-full min-h-0 flex-col">
        <div className="shrink-0 border-b border-border/50 bg-background px-4 py-3 @[1200px]/rails:hidden">
          <SettingsNav
            items={navItems}
            activeId={activeSection}
            onSelect={setActiveSection}
            variant="compact"
          />
        </div>

        <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-8 sm:px-8 lg:px-10">
          <div className="mb-8 flex items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-foreground">
                {t(`sections.${activeSection}.title`)}
              </h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {t(`sections.${activeSection}.description`)}
              </p>
            </div>
            <Button onClick={handleSave} size="sm">
              {t("saveChanges")}
            </Button>
          </div>

          <SettingsSectionPanel {...panelProps} />
        </div>
      </div>
    </AppDetailRailsShell>
  )
}