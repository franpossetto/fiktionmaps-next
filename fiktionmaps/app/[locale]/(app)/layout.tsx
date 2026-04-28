"use client"

import { AppFloatingNav } from "@/components/layout/app-floating-nav"
import { AppTopNavbar } from "@/components/layout/app-top-navbar"
import { MapEngineProvider } from "@/lib/map"
import { mapboxEngine } from "@/lib/map/mapbox"
import { GeoProvider } from "@/components/checkins/geo-provider"
import { CityCheckinSheet } from "@/components/checkins/city-checkin-sheet"
import { usePathname } from "@/i18n/navigation"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isMapView = pathname?.startsWith("/map")

  return (
    <MapEngineProvider engine={mapboxEngine}>
      <GeoProvider>
        <div className="flex h-screen w-screen overflow-hidden">
          <AppFloatingNav />
          <main className="relative flex-1 min-w-0 overflow-hidden">
            {isMapView ? (
              children
            ) : (
              <div className="flex h-full flex-col">
                <AppTopNavbar />
                <div className="min-h-0 flex-1">{children}</div>
              </div>
            )}
          </main>
        </div>
        <CityCheckinSheet />
      </GeoProvider>
    </MapEngineProvider>
  )
}
