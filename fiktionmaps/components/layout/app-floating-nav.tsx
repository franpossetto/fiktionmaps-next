"use client"

import { Home, Map } from "lucide-react"
import { useEffect } from "react"
import { useTranslations } from "next-intl"
import { Link, usePathname } from "@/i18n/navigation"

const MAP_LEFT_CONTROLS_OFFSET_PX = 76

export function AppFloatingNav() {
  const pathname = usePathname()
  const isMapView = pathname?.startsWith("/map")
  const tNav = useTranslations("Nav")

  useEffect(() => {
    if (!isMapView) {
      document.documentElement.style.removeProperty("--map-left-controls-offset")
      return
    }

    document.documentElement.style.setProperty(
      "--map-left-controls-offset",
      `${MAP_LEFT_CONTROLS_OFFSET_PX}px`,
    )

    return () => {
      document.documentElement.style.removeProperty("--map-left-controls-offset")
    }
  }, [isMapView])

  return (
    <div className="pointer-events-none fixed bottom-4 left-4 z-[1200]">
      <Link
        href={isMapView ? "/fictions" : "/map"}
        aria-label={isMapView ? tNav("goToFictions") : tNav("openMap")}
        title={isMapView ? tNav("home") : tNav("map")}
        className="pointer-events-auto inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-background text-foreground shadow-lg backdrop-blur-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:scale-105 hover:bg-accent hover:text-accent-foreground hover:shadow-xl active:translate-y-0 active:scale-95"
      >
        {isMapView ? <Home className="h-5 w-5" /> : <Map className="h-5 w-5" />}
      </Link>
    </div>
  )
}
