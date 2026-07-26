"use client"

import type { MouseEvent } from "react"
import type { MapCluster } from "@/src/places/domain/map-cluster.entity"

function formatCount(count: number): string {
  if (count >= 1000) return `${Math.round(count / 100) / 10}k`
  return String(count)
}

type PillTone = {
  pill: string
  tip: string
  text: string
}

/** Soft pastel fills — fully opaque so pins stay readable on the map. */
const PILL_TONES: readonly PillTone[] = [
  { pill: "#d8ecf8", tip: "#d8ecf8", text: "#1a2a36" },
  { pill: "#e8dff5", tip: "#e8dff5", text: "#2a1f3d" },
  { pill: "#f8e0e8", tip: "#f8e0e8", text: "#3a1f2a" },
  { pill: "#f5ebd0", tip: "#f5ebd0", text: "#3a2f14" },
  { pill: "#dcefe4", tip: "#dcefe4", text: "#1a3328" },
]

function toneForId(id: string): PillTone {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash + id.charCodeAt(i) * (i + 1)) % 997
  return PILL_TONES[hash % PILL_TONES.length]!
}

/**
 * Free-world aggregate pin (no images):
 * pastel name pill + dark count badge, anchored with a tip.
 */
export function WorldClusterPin({
  cluster,
  cityName,
  onSelectCity,
}: {
  cluster: MapCluster
  cityName?: string | null
  onSelectCity?: () => void
}) {
  const label =
    cityName?.trim() ||
    (cluster.cityCount > 1 ? `${cluster.cityCount} cities` : "Places")
  const count = formatCount(cluster.count)
  const tone = toneForId(cluster.id)

  const stopAnd = (e: MouseEvent, fn?: () => void) => {
    e.stopPropagation()
    e.preventDefault()
    fn?.()
  }

  return (
    <button
      type="button"
      className="cursor-pointer appearance-none border-0 bg-transparent p-0"
      aria-label={`Enter ${label}, ${cluster.count} places`}
      onClick={(e) => stopAnd(e, onSelectCity)}
    >
      <span className="relative inline-flex flex-col items-center drop-shadow-[0_2px_8px_rgba(0,0,0,0.28)]">
        <span
          className="relative max-w-[148px] rounded-full border border-white px-3 py-1.5"
          style={{ backgroundColor: tone.pill, color: tone.text }}
        >
          <span
            className="absolute -left-1 -top-2 z-10 flex h-5 min-w-5 items-center justify-center rounded-md bg-[#1a1a1a] px-1.5 text-[10px] font-bold leading-none tabular-nums text-white"
            aria-hidden
          >
            {count}
          </span>
          <span className="block truncate text-left text-[12px] font-semibold leading-tight tracking-tight">
            {label}
          </span>
        </span>
        <span
          className="mt-[-1px] h-0 w-0 border-l-[6px] border-r-[6px] border-t-[7px] border-l-transparent border-r-transparent"
          style={{ borderTopColor: tone.tip }}
          aria-hidden
        />
      </span>
    </button>
  )
}
