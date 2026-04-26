"use client"

import Image from "next/image"
import { ArrowRight } from "lucide-react"
import type { Location } from "@/src/locations/domain/location.entity"

interface LocationCardProps {
  location: Location
  onClick?: () => void
  hoverLabel?: string
  /** Slightly tighter layout and smaller type (e.g. fiction detail grid). */
  compact?: boolean
}

export function LocationCard({
  location,
  onClick,
  hoverLabel = "View details",
  compact = false,
}: LocationCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex flex-col text-left ${compact ? "gap-1.5" : "gap-2"}`}
    >
      <div
        className={`relative aspect-[16/9] w-full overflow-hidden border border-border/50 transition-all duration-300 group-hover:border-primary/40 group-hover:shadow-lg group-hover:shadow-primary/5 ${compact ? "rounded-md" : "rounded-lg"}`}
      >
        <Image
          src={location.image}
          alt={location.name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 20vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        <div
          className={`absolute bottom-0 left-0 right-0 flex items-center gap-2 opacity-0 transition-opacity duration-300 group-hover:opacity-100 ${compact ? "p-2" : "p-3"}`}
        >
          <div
            className={`flex items-center justify-center rounded-full bg-foreground/90 ${compact ? "h-7 w-7" : "h-8 w-8"}`}
          >
            <ArrowRight className={`text-background ${compact ? "h-3.5 w-3.5" : "h-4 w-4"}`} />
          </div>
          <span className="text-xs font-medium text-foreground">{hoverLabel}</span>
        </div>
      </div>
      <div>
        <h3
          className={`font-semibold text-foreground transition-colors group-hover:text-primary ${compact ? "text-xs" : "text-sm"}`}
        >
          {location.name}
        </h3>
        <p className={`line-clamp-1 text-muted-foreground ${compact ? "text-[11px]" : "text-xs"}`}>
          {location.address}
        </p>
      </div>
    </button>
  )
}
