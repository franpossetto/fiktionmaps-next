"use client"

import { Sparkles } from "lucide-react"
import type { City } from "@/src/cities/city.domain"
import type { Location } from "@/src/locations"

interface MapAIChatProps {
  onClose: () => void
  onMapUpdate: (city: City, fictionIds: string[], locations: Location[]) => void
}

export function MapAIChat({ onClose }: MapAIChatProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center bg-[#0d1117]">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/20">
        <Sparkles className="h-5 w-5 text-cyan-400" />
      </div>
      <p className="text-sm font-semibold text-foreground">AI Mode</p>
      <p className="text-xs text-muted-foreground leading-relaxed">
        AI packages are being installed. Please refresh in a moment.
      </p>
      <button
        onClick={onClose}
        className="mt-2 text-xs text-cyan-400 hover:underline"
      >
        Close
      </button>
    </div>
  )
}
