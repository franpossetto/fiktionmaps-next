"use client"

import { Suspense, useState, useEffect, useMemo } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "@/i18n/navigation"
import { useThemeSettings } from "@/lib/theme-settings-context"
import type { ThemeBase, StyleVariant, TimeOfDay } from "@/lib/theme-settings"
import type { ThemeSettings } from "@/lib/theme-settings"
import { Button } from "@/components/ui/button"
import { FictionContributeLayout } from "@/components/contribute/fiction/fiction-contribute-layout"
import {
  SettingsAccountProvider,
  useSettingsAccount,
  type SessionAccount,
} from "./settings-account-context"
import { SettingsNav } from "./settings-nav"
import { SettingsUserHeader } from "./settings-user-header"
import { SettingsPermissionAside } from "./settings-permission-aside"
import {
  SettingsPermissionAsideSkeleton,
  SettingsUserHeaderSkeleton,
} from "./settings-skeletons"
import {
  SETTINGS_SECTION_IDS,
  type LocalClock,
  type SettingsNavItem,
  type SettingsSectionId,
} from "./settings-sections"
import { SettingsSectionPanel } from "./settings-section-panels"
import mapDay from "@/lib/map/styles/mapbox_day.png"
import mapDawn from "@/lib/map/styles/mapbox_dawn.png"
import mapDusk from "@/lib/map/styles/mapbox_dusk.png"
import mapNight from "@/lib/map/styles/mapbox_night.png"

type MapStyleOption = "day" | "dawn" | "night" | "dusk"

function readLocalClock(): LocalClock {
  return {
    time: new Date().toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }),
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  }
}

function UserHeaderContent() {
  const { profile } = useSettingsAccount()
  const username = profile?.username?.trim() ?? ""
  if (!username) return null

  return (
    <SettingsUserHeader
      username={username}
      fullName={profile?.fullName}
      avatar={profile?.avatar}
      avatarFocus={profile?.avatarFocus ?? null}
    />
  )
}

function UserHeaderSlot() {
  return (
    <Suspense fallback={<SettingsUserHeaderSkeleton />}>
      <UserHeaderContent />
    </Suspense>
  )
}

function PermissionAsideContent() {
  const { profile } = useSettingsAccount()
  return <SettingsPermissionAside role={profile?.role ?? "user"} />
}

function PermissionAsideSlot() {
  return (
    <Suspense fallback={<SettingsPermissionAsideSkeleton />}>
      <PermissionAsideContent />
    </Suspense>
  )
}

export function SettingsPage({
  accountPromise,
}: {
  accountPromise: Promise<SessionAccount>
}) {
  return (
    <SettingsAccountProvider accountPromise={accountPromise}>
      <SettingsPageShell />
    </SettingsAccountProvider>
  )
}

function SettingsPageShell() {
  const t = useTranslations("Settings")
  const router = useRouter()
  const { settings, applyAndSave, timeOfDay } = useThemeSettings()
  const [pending, setPending] = useState<ThemeSettings>(settings)
  const [activeSection, setActiveSection] = useState<SettingsSectionId>("account")
  const [localClock, setLocalClock] = useState<LocalClock | null>(null)

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
  }, [settings])

  // Locale/timezone are client-only, so the clock is resolved after hydration.
  useEffect(() => {
    setLocalClock(readLocalClock())
    const id = setInterval(() => setLocalClock(readLocalClock()), 60_000)
    return () => clearInterval(id)
  }, [])

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
    localClock,
    timeOfDayLabels,
  }

  const navAside = (
    <div className="mx-auto w-full max-w-full space-y-5 pt-1">
      <UserHeaderSlot />
      <SettingsNav
        items={navItems}
        activeId={activeSection}
        onSelect={setActiveSection}
      />
    </div>
  )

  return (
    <FictionContributeLayout
      leftAside={navAside}
      rightAside={
        <div className="w-full min-w-0 max-w-full space-y-5 pt-1">
          <PermissionAsideSlot />
        </div>
      }
    >
      <div className="w-full min-w-0 px-4 pb-10 sm:px-5">
        <div className="mb-6 space-y-4 min-[900px]:hidden">
          <UserHeaderSlot />
          <SettingsNav
            items={navItems}
            activeId={activeSection}
            onSelect={setActiveSection}
            variant="compact"
          />
        </div>

        <div className="mb-8 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              {t(`sections.${activeSection}.title`)}
            </h1>
            {activeSection !== "account" ? (
              <p className="mt-0.5 text-sm text-muted-foreground">
                {t(`sections.${activeSection}.description`)}
              </p>
            ) : null}
          </div>
          {activeSection !== "account" ? (
            <Button onClick={handleSave} size="sm">
              {t("saveChanges")}
            </Button>
          ) : null}
        </div>

        <SettingsSectionPanel {...panelProps} />

        <div className="mt-8 min-[900px]:hidden">
          <PermissionAsideSlot />
        </div>
      </div>
    </FictionContributeLayout>
  )
}
