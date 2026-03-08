"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useThemeSettings } from "@/lib/theme-settings-context"
import type { ThemeBase, StyleVariant, TimeOfDay } from "@/lib/theme-settings"
import type { ThemeSettings } from "@/lib/theme-settings"
import { Clock, Check, Palette } from "lucide-react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type MapStyleOption = "day" | "dawn" | "night" | "dusk"
const MAP_STYLE_OPTIONS: { id: MapStyleOption; label: string; base: ThemeBase; variant: StyleVariant; image: typeof mapDay }[] = [
  { id: "day", label: "Day", base: "light", variant: "1", image: mapDay },
  { id: "dawn", label: "Dawn", base: "light", variant: "2", image: mapDawn },
  { id: "night", label: "Night", base: "dark", variant: "1", image: mapNight },
  { id: "dusk", label: "Dusk", base: "dark", variant: "2", image: mapDusk },
]

// Local map style previews from lib/map/styles
import mapDay from "@/lib/map/styles/mapbox_day.png"
import mapDawn from "@/lib/map/styles/mapbox_dawn.png"
import mapDusk from "@/lib/map/styles/mapbox_dusk.png"
import mapNight from "@/lib/map/styles/mapbox_night.png"

const timeOfDayLabels: Record<TimeOfDay, string> = {
  day: "Day",
  afternoon: "Afternoon",
  evening: "Evening",
  night: "Night",
}

export function SettingsPage() {
  const router = useRouter()
  const { settings, applyAndSave, timeOfDay } = useThemeSettings()
  const [pending, setPending] = useState<ThemeSettings>(settings)

  useEffect(() => {
    setPending(settings)
  }, [settings.mode, settings.base, settings.styleVariant])

  const handleSave = () => {
    applyAndSave(pending)
    router.back()
  }

  const now = new Date()
  const localTime = now.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
  const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone

  // Map preview by time of day: day, dawn, dusk, night (your 4 images)
  const mapPreviewByTimeOfDay =
    timeOfDay === "day"
      ? mapDay
      : timeOfDay === "afternoon"
        ? mapDawn
        : timeOfDay === "evening"
          ? mapDusk
          : mapNight

  return (
    <div className="flex h-full flex-col overflow-auto bg-background">
      {/* Header — minimal like Notion */}
      <header className="shrink-0 border-b border-border/60 bg-background/95 px-4 py-5 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:px-8">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Settings
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Appearance and preferences
        </p>
      </header>

      <div className="flex-1 px-4 py-8 md:px-8 md:py-10">
        <div className="mx-auto max-w-2xl space-y-10">
          {/* Section: Theme mode */}
          <section>
            <h2 className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Theme mode
            </h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Choose how the app and map look — pick a fixed theme or follow your local time of day.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setPending((p) => ({ ...p, mode: "manual" }))}
                className={cn(
                  "group relative flex flex-col overflow-hidden rounded-xl border-2 bg-card text-left transition-all hover:border-primary/40 hover:shadow-md",
                  pending.mode === "manual"
                    ? "border-primary shadow-[0_0_0_1px_hsl(var(--primary))]"
                    : "border-border"
                )}
              >
                <div className="flex items-center gap-3 p-4 pb-2">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <Palette className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <span className="font-medium text-foreground">Manual</span>
                    <p className="text-xs text-muted-foreground">
                      Choose light or dark and a style
                    </p>
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
                    : "border-border"
                )}
              >
                <div className="flex items-center gap-3 p-4 pb-2">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <span className="font-medium text-foreground">Real time</span>
                    <p className="text-xs text-muted-foreground">
                      Theme follows your local time
                    </p>
                  </div>
                </div>
                {pending.mode === "realtime" && (
                  <div className="absolute right-3 top-3 rounded-full bg-primary p-1 text-primary-foreground">
                    <Check className="h-3.5 w-3.5" />
                  </div>
                )}
              </button>
            </div>
          </section>

          {pending.mode === "manual" && (
            <section>
              <h2 className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Map &amp; theme
              </h2>
              <p className="mb-4 text-sm text-muted-foreground">
                Choose one of four styles. Click Save to apply and go back.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                {MAP_STYLE_OPTIONS.map((opt) => {
                  const isSelected =
                    pending.base === opt.base && pending.styleVariant === opt.variant
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() =>
                        setPending((p) => ({ ...p, mode: "manual", base: opt.base, styleVariant: opt.variant }))
                      }
                      className={cn(
                        "group relative overflow-hidden rounded-xl border-2 bg-card text-left transition-all hover:border-primary/40 hover:shadow-md",
                        isSelected
                          ? "border-primary shadow-[0_0_0_1px_hsl(var(--primary))]"
                          : "border-border"
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
            </section>
          )}

          {pending.mode === "realtime" && (
            <section>
              <h2 className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Current period
              </h2>
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-2xl font-semibold tabular-nums text-foreground">
                      {timeOfDay ? timeOfDayLabels[timeOfDay] : "—"}
                    </p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      Based on your local time
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {localTz} · {localTime}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <div className="overflow-hidden rounded-lg border border-border">
                      <Image
                        src={mapPreviewByTimeOfDay}
                        alt="Current map style"
                        width={160}
                        height={90}
                        className="h-[90px] w-[160px] object-cover"
                      />
                    </div>
                  </div>
                </div>
                <p className="mt-4 border-t border-border pt-4 text-xs text-muted-foreground">
                  Day 5:00–12:00 · Afternoon 12:00–17:00 · Evening 17:00–21:00 · Night 21:00–5:00
                </p>
              </div>
            </section>
          )}

          <section className="flex justify-end border-t border-border pt-6">
            <Button onClick={handleSave} size="lg">
              Save and go back
            </Button>
          </section>
        </div>
      </div>
    </div>
  )
}
