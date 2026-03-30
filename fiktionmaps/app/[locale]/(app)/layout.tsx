"use client"

import { AppSidebar } from "@/components/layout/app-sidebar"
import { AppBottomNav } from "@/components/layout/app-bottom-nav"
import { MapEngineProvider } from "@/lib/map"
import { mapboxEngine } from "@/lib/map/mapbox"
import { GeoProvider } from "@/components/checkins/geo-provider"
import { CityCheckinSheet } from "@/components/checkins/city-checkin-sheet"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <MapEngineProvider engine={mapboxEngine}>
      <GeoProvider>
        <div className="flex h-screen w-screen overflow-hidden flex-col md:flex-row">
          <div className="hidden md:flex md:w-[60px] md:min-w-[60px] md:shrink-0 md:flex-col">
            <AppSidebar />
          </div>

          <main className="relative flex-1 min-w-0 overflow-hidden mb-[70px] md:mb-0">
            {children}
          </main>

          <nav className="fixed bottom-0 left-0 right-0 md:hidden bg-chrome border-t border-chrome-border z-[999]">
            <AppBottomNav />
          </nav>
        </div>
        <CityCheckinSheet />
      </GeoProvider>
    </MapEngineProvider>
  )
}
