"use client"

import { Suspense, type ReactNode } from "react"
import { useTranslations } from "next-intl"
import Image from "next/image"
import { Clock, Check, Palette } from "lucide-react"
import type {
  ThemeBase,
  StyleVariant,
  TimeOfDay,
  ThemeSettings,
} from "@/lib/theme-settings"
import { cn } from "@/lib/utils"
import { ProfilePersonalInfoForm } from "@/components/profile/profile-personal-info-form"
import { MarkersSettingsPanel } from "./markers-settings-panel"
import { ChangePasswordForm } from "./change-password-form"
import { useSettingsAccount } from "./settings-account-context"
import { SettingsAccountSectionSkeleton } from "./settings-skeletons"
import { FORM_CARD_ACTION_CLASS } from "@/components/ui/form-card"
import type { LocalClock, SettingsSectionId } from "./settings-sections"

type MapStyleOption = "day" | "dawn" | "night" | "dusk"

export type SettingsSectionPanelsProps = {
  sectionId: SettingsSectionId
  pending: ThemeSettings
  setPending: React.Dispatch<React.SetStateAction<ThemeSettings>>
  markerPreviewThemeBase: ThemeBase
  timeOfDay: TimeOfDay | null
  mapStyleOptions: {
    id: MapStyleOption
    label: string
    base: ThemeBase
    variant: StyleVariant
    image: typeof import("@/lib/map/styles/mapbox_day.png").default
  }[]
  mapPreviewByTimeOfDay: typeof import("@/lib/map/styles/mapbox_day.png").default
  localClock: LocalClock | null
  timeOfDayLabels: Record<TimeOfDay, string>
}

function SettingsSubsection({
  title,
  description,
  children,
  accent = false,
}: {
  title: string
  description?: string
  children: ReactNode
  /** Yellow vertical bar used on place/fiction section headings. */
  accent?: boolean
}) {
  return (
    <section className="space-y-4">
      <div>
        {accent ? (
          <div className="flex min-w-0 items-center gap-3">
            <span className="h-7 w-1 shrink-0 rounded-full bg-yellow-500" aria-hidden />
            <h2 className="text-base font-semibold tracking-tight text-foreground">
              {title}
            </h2>
          </div>
        ) : (
          <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {title}
          </h2>
        )}
        {description ? (
          <p className={cn("text-sm text-muted-foreground", accent ? "mt-2" : "mt-1")}>
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  )
}

function ThemeModePanel({
  pending,
  setPending,
}: Pick<SettingsSectionPanelsProps, "pending" | "setPending">) {
  const t = useTranslations("Settings")

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <button
        type="button"
        onClick={() => setPending((p) => ({ ...p, mode: "manual" }))}
        className={cn(
          "group relative flex flex-col overflow-hidden rounded-xl border-2 bg-card text-left transition-all hover:border-primary/40 hover:shadow-md",
          pending.mode === "manual"
            ? "border-primary shadow-[0_0_0_1px_hsl(var(--primary))]"
            : "border-border",
        )}
      >
        <div className="flex items-center gap-3 p-4 pb-2">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
            <Palette className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <span className="font-medium text-foreground">{t("manual")}</span>
            <p className="text-xs text-muted-foreground">{t("manualHint")}</p>
          </div>
        </div>
        {pending.mode === "manual" && (
          <div className="absolute right-3 top-3 rounded-full bg-primary p-1 text-primary-foreground">
            <Check className="h-3.5 w-3.5" />
          </div>
        )}
      </button>

      <button
        type="button"
        onClick={() => setPending((p) => ({ ...p, mode: "realtime" }))}
        className={cn(
          "group relative flex flex-col overflow-hidden rounded-xl border-2 bg-card text-left transition-all hover:border-primary/40 hover:shadow-md",
          pending.mode === "realtime"
            ? "border-primary shadow-[0_0_0_1px_hsl(var(--primary))]"
            : "border-border",
        )}
      >
        <div className="flex items-center gap-3 p-4 pb-2">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
            <Clock className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <span className="font-medium text-foreground">{t("realtime")}</span>
            <p className="text-xs text-muted-foreground">{t("realtimeHint")}</p>
          </div>
        </div>
        {pending.mode === "realtime" && (
          <div className="absolute right-3 top-3 rounded-full bg-primary p-1 text-primary-foreground">
            <Check className="h-3.5 w-3.5" />
          </div>
        )}
      </button>
    </div>
  )
}

function MapThemePanel({
  pending,
  setPending,
  mapStyleOptions,
}: Pick<SettingsSectionPanelsProps, "pending" | "setPending" | "mapStyleOptions">) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {mapStyleOptions.map((opt) => {
        const isSelected = pending.base === opt.base && pending.styleVariant === opt.variant
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() =>
              setPending((p) => ({
                ...p,
                mode: "manual",
                base: opt.base,
                styleVariant: opt.variant,
              }))
            }
            className={cn(
              "group relative overflow-hidden rounded-xl border-2 bg-card text-left transition-all hover:border-primary/40 hover:shadow-md",
              isSelected
                ? "border-primary shadow-[0_0_0_1px_hsl(var(--primary))]"
                : "border-border",
            )}
          >
            <div className="aspect-video w-full overflow-hidden bg-muted">
              <Image
                src={opt.image}
                alt={opt.label}
                width={320}
                height={180}
                className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]"
              />
            </div>
            <div className="flex items-center gap-3 p-3">
              <span className="font-medium text-foreground">{opt.label}</span>
              {isSelected && (
                <div className="ml-auto rounded-full bg-primary p-1 text-primary-foreground">
                  <Check className="h-3.5 w-3.5" />
                </div>
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}

function CurrentPeriodPanel({
  timeOfDay,
  timeOfDayLabels,
  localClock,
  mapPreviewByTimeOfDay,
}: Pick<
  SettingsSectionPanelsProps,
  "timeOfDay" | "timeOfDayLabels" | "localClock" | "mapPreviewByTimeOfDay"
>) {
  const t = useTranslations("Settings")

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-2xl font-semibold tabular-nums text-foreground">
            {timeOfDay ? timeOfDayLabels[timeOfDay] : "—"}
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">{t("basedOnLocalTime")}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {localClock ? `${localClock.timeZone} · ${localClock.time}` : "—"}
          </p>
        </div>
        <div className="flex gap-2">
          <div className="overflow-hidden rounded-lg border border-border">
            <Image
              src={mapPreviewByTimeOfDay}
              alt={t("currentMapStyleAlt")}
              width={160}
              height={90}
              className="h-[90px] w-[160px] object-cover"
            />
          </div>
        </div>
      </div>
      <p className="mt-4 border-t border-border pt-4 text-xs text-muted-foreground">
        {t("timeRangesLegend")}
      </p>
    </div>
  )
}


/** Suspends on the server account read; rendered behind `SettingsAccountSectionSkeleton`. */
function AccountPanel() {
  const t = useTranslations("Settings")
  const { profile, email, onProfileSaved } = useSettingsAccount()

  return (
    <div className="space-y-10">
      {profile ? (
        <SettingsSubsection
          accent
          title={t("account.personalInfoSectionTitle")}
          description={t("account.personalInfoSectionDescription")}
        >
          <ProfilePersonalInfoForm
            variant="card"
            idPrefix="settings-profile"
            username={profile.username}
            email={email}
            initial={{
              fullName: profile.fullName,
              bio: profile.bio,
              gender: profile.gender,
              phone: profile.phone,
              dateOfBirth: profile.dateOfBirth,
            }}
            onSaved={onProfileSaved}
            saveButtonClassName={FORM_CARD_ACTION_CLASS}
          />
        </SettingsSubsection>
      ) : null}

      <SettingsSubsection
        accent
        title={t("account.passwordSectionTitle")}
        description={t("account.passwordSectionDescription")}
      >
        <ChangePasswordForm email={email} />
      </SettingsSubsection>
    </div>
  )
}

export function SettingsSectionPanel(props: SettingsSectionPanelsProps) {
  const t = useTranslations("Settings")
  const { sectionId, pending } = props

  if (sectionId === "appearance") {
    return (
      <div className="space-y-10">
        <SettingsSubsection title={t("themeMode")} description={t("themeModeDescription")}>
          <ThemeModePanel pending={pending} setPending={props.setPending} />
        </SettingsSubsection>

        {pending.mode === "manual" ? (
          <SettingsSubsection title={t("mapStyle")} description={t("mapStyleDescription")}>
            <MapThemePanel
              pending={pending}
              setPending={props.setPending}
              mapStyleOptions={props.mapStyleOptions}
            />
          </SettingsSubsection>
        ) : null}

        {pending.mode === "realtime" ? (
          <SettingsSubsection title={t("currentPeriod")} description={t("currentPeriodDescription")}>
            <CurrentPeriodPanel
              timeOfDay={props.timeOfDay}
              timeOfDayLabels={props.timeOfDayLabels}
              localClock={props.localClock}
              mapPreviewByTimeOfDay={props.mapPreviewByTimeOfDay}
            />
          </SettingsSubsection>
        ) : null}
      </div>
    )
  }

  if (sectionId === "account") {
    return (
      <Suspense fallback={<SettingsAccountSectionSkeleton />}>
        <AccountPanel />
      </Suspense>
    )
  }

  return (
    <MarkersSettingsPanel
      pending={pending}
      setPending={props.setPending}
      markerPreviewThemeBase={props.markerPreviewThemeBase}
    />
  )
}
