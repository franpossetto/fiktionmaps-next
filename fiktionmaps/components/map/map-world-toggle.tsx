"use client"

import { Globe2, MapPinned } from "lucide-react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { MapBrowseMode } from "@/lib/map/world-map"
import { MAP_MODE_WORLD } from "@/lib/map/world-map"

type MapWorldToggleProps = {
  mode: MapBrowseMode
  onToggle: () => void
  className?: string
}

export function MapWorldToggle({ mode, onToggle, className }: MapWorldToggleProps) {
  const t = useTranslations("Map")
  const isWorld = mode === MAP_MODE_WORLD

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onToggle}
      className={cn(
        "h-9 gap-1.5 rounded-xl border-border bg-background px-2.5 shadow-sm",
        isWorld && "border-primary/40 bg-primary/5",
        className,
      )}
      aria-pressed={isWorld}
      title={isWorld ? t("selectCity") : t("enterWorldMode")}
    >
      {isWorld ? (
        <MapPinned className="h-4 w-4 shrink-0" aria-hidden />
      ) : (
        <Globe2 className="h-4 w-4 shrink-0" aria-hidden />
      )}
      <span className="hidden text-xs font-medium sm:inline">
        {isWorld ? t("selectCity") : t("worldModeOff")}
      </span>
    </Button>
  )
}
