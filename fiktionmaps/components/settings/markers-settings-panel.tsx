"use client"

import { useMemo } from "react"
import { useTranslations } from "next-intl"
import { Check } from "lucide-react"
import type {
  Map2dMarkerShape,
  MapMarkerHoverScaleMode,
  MapMarkerLabelMode,
  ThemeBase,
  ThemeSettings,
} from "@/lib/theme-settings"
import { cn } from "@/lib/utils"
import { MapMarkerShapePreview } from "./map-marker-shape-preview"

type MarkersSettingsPanelProps = {
  pending: ThemeSettings
  setPending: React.Dispatch<React.SetStateAction<ThemeSettings>>
  markerPreviewThemeBase: ThemeBase
}

type Option<T extends string> = { id: T; label: string; hint?: string }

function MarkerSettingRow<T extends string>({
  title,
  description,
  options,
  value,
  onChange,
}: {
  title: string
  description?: string
  options: readonly Option<T>[]
  value: T
  onChange: (id: T) => void
}) {
  return (
    <div className="grid gap-3 px-5 py-4 sm:grid-cols-[minmax(0,10rem)_1fr] sm:items-center sm:gap-6 sm:px-6">
      <div className="min-w-0">
        <h2 className="text-sm font-medium text-foreground">{title}</h2>
        {description ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {options.map((opt) => {
          const isSelected = value === opt.id
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChange(opt.id)}
              className={cn(
                "relative flex flex-col items-center justify-center rounded-lg border px-2.5 py-2 text-center transition-all hover:border-primary/40",
                isSelected
                  ? "border-primary bg-primary/5 shadow-[0_0_0_1px_hsl(var(--primary))]"
                  : "border-border bg-background hover:bg-muted/30",
              )}
            >
              <span className="text-sm font-medium text-foreground">{opt.label}</span>
              {opt.hint ? (
                <span className="mt-0.5 text-[11px] leading-tight text-muted-foreground">
                  {opt.hint}
                </span>
              ) : null}
              {isSelected ? (
                <span className="absolute right-1.5 top-1.5 rounded-full bg-primary p-0.5 text-primary-foreground">
                  <Check className="h-2.5 w-2.5" />
                </span>
              ) : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function MarkersSettingsPanel({
  pending,
  setPending,
  markerPreviewThemeBase,
}: MarkersSettingsPanelProps) {
  const t = useTranslations("Settings.markers")
  const isDark = markerPreviewThemeBase === "dark"

  const shapeOptions = useMemo(
    () =>
      [
        { id: "square" as const, label: t("shapeSquare"), hint: t("shapeSquareHint") },
        { id: "round" as const, label: t("shapeRound"), hint: t("shapeRoundHint") },
      ] as const,
    [t],
  )

  const labelOptions = useMemo(
    () =>
      [
        { id: "always" as const, label: t("labelsAlways"), hint: t("labelsAlwaysHint") },
        { id: "hover" as const, label: t("labelsHover"), hint: t("labelsHoverHint") },
      ] as const,
    [t],
  )

  const hoverOptions = useMemo(
    () =>
      [
        { id: "normal" as const, label: t("hoverNormal"), hint: t("hoverNormalHint") },
        { id: "strong" as const, label: t("hoverStrong"), hint: t("hoverStrongHint") },
      ] as const,
    [t],
  )

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div
        className={cn(
          "flex min-h-[min(320px,42vh)] w-full items-center justify-center border-b border-border px-6 py-14 sm:min-h-[360px] sm:py-16",
          isDark ? "dark bg-zinc-900/95" : "bg-slate-100/95",
        )}
      >
        <MapMarkerShapePreview
          variant="standalone"
          shape={pending.marker2dShape}
          themeBase={markerPreviewThemeBase}
          labelMode={pending.markerLabelMode}
          hoverScaleMode={pending.markerHoverScale}
          simulateHover
        />
      </div>

      <div className="divide-y divide-border bg-card">
        <MarkerSettingRow<Map2dMarkerShape>
          title={t("shapeTitle")}
          description={t("shapeDescription")}
          options={shapeOptions}
          value={pending.marker2dShape}
          onChange={(id) => setPending((p) => ({ ...p, marker2dShape: id }))}
        />
        <MarkerSettingRow<MapMarkerLabelMode>
          title={t("labelsTitle")}
          description={t("labelsDescription")}
          options={labelOptions}
          value={pending.markerLabelMode}
          onChange={(id) => setPending((p) => ({ ...p, markerLabelMode: id }))}
        />
        <MarkerSettingRow<MapMarkerHoverScaleMode>
          title={t("hoverTitle")}
          description={t("hoverDescription")}
          options={hoverOptions}
          value={pending.markerHoverScale}
          onChange={(id) => setPending((p) => ({ ...p, markerHoverScale: id }))}
        />
      </div>
    </div>
  )
}
