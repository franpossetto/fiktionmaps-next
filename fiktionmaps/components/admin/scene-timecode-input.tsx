"use client"

import type { TimecodeParts } from "@/lib/scenes/scene-timecode"

interface SceneTimecodeInputProps {
  value: TimecodeParts
  onChange: (next: TimecodeParts) => void
  error?: string
  labels?: { hours: string; minutes: string; seconds: string }
}

export function SceneTimecodeInput({
  value,
  onChange,
  error,
  labels = { hours: "Hours", minutes: "Min", seconds: "Sec" },
}: SceneTimecodeInputProps) {
  const setPart = (key: keyof TimecodeParts, raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 2)
    onChange({ ...value, [key]: digits })
  }

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-wide text-muted-foreground">{labels.hours}</label>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="00"
            value={value.h}
            onChange={(e) => setPart("h", e.target.value)}
            className="w-14 rounded-lg border border-border bg-card px-2 py-2 text-center font-mono text-sm text-foreground tabular-nums focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20"
            maxLength={2}
            aria-label={labels.hours}
          />
        </div>
        <span className="pb-2 font-mono text-muted-foreground">:</span>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-wide text-muted-foreground">{labels.minutes}</label>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="00"
            value={value.m}
            onChange={(e) => setPart("m", e.target.value)}
            className="w-14 rounded-lg border border-border bg-card px-2 py-2 text-center font-mono text-sm text-foreground tabular-nums focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20"
            maxLength={2}
            aria-label={labels.minutes}
          />
        </div>
        <span className="pb-2 font-mono text-muted-foreground">:</span>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-wide text-muted-foreground">{labels.seconds}</label>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="00"
            value={value.s}
            onChange={(e) => setPart("s", e.target.value)}
            className="w-14 rounded-lg border border-border bg-card px-2 py-2 text-center font-mono text-sm text-foreground tabular-nums focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20"
            maxLength={2}
            aria-label={labels.seconds}
          />
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground">
        {error ? <span className="text-red-400">{error}</span> : "Time in the film (optional). Stored as HH:MM:SS."}
      </p>
    </div>
  )
}
