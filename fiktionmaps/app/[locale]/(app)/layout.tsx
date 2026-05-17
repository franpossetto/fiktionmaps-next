"use client"

import { AppFloatingNav } from "@/components/layout/app-floating-nav"
import { AppTopNavbar, AppTopNavbarNoSearch } from "@/components/layout/app-top-navbar"
import { MapEngineProvider } from "@/lib/map"
import { mapboxEngine } from "@/lib/map/mapbox"
import { GeoProvider } from "@/components/checkins/geo-provider"
import { CityCheckinSheet } from "@/components/checkins/city-checkin-sheet"
import { usePathname } from "@/i18n/navigation"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isMapView = pathname?.startsWith("/map")
  const isContributeFlow = pathname != null && /(^|\/)contribute(\/|$)/.test(pathname)

  return (
    <MapEngineProvider engine={mapboxEngine}>
      <GeoProvider>
        <div className="flex h-screen w-screen overflow-hidden">
          <main className="relative flex-1 min-w-0 overflow-hidden">
            {isMapView ? (
              children
            ) : (
              <div className="flex h-full flex-col">
                {isContributeFlow ? <AppTopNavbarNoSearch /> : <AppTopNavbar />}
                <div className="min-h-0 flex-1">{children}</div>
              </div>
            )}
          </main>
        </div>
        {/**
         * Fuera del contenedor con overflow-hidden para que `position: fixed` no quede recortado
         * en algunos navegadores junto con el map / wizards.
         */}
        <AppFloatingNav />
        <CityCheckinSheet />
      </GeoProvider>
    </MapEngineProvider>
  )
}
