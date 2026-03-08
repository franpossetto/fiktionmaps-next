"use client"

import { AppSidebar } from "@/components/layout/app-sidebar"
import { AppBottomNav } from "@/components/layout/app-bottom-nav"
import { MapEngineProvider } from "@/lib/map"
import { mapboxEngine } from "@/lib/map/mapbox"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <MapEngineProvider engine={mapboxEngine}>
      <div className="flex h-screen w-screen overflow-hidden flex-col md:flex-row">
        <div className="hidden md:flex md:w-[60px] md:shrink-0">
          <AppSidebar />
        </div>

        <main className="relative flex-1 overflow-hidden mb-[70px] md:mb-0">
          {children}
        </main>

        <nav className="fixed bottom-0 left-0 right-0 md:hidden bg-chrome border-t border-chrome-border z-[999]">
          <AppBottomNav />
        </nav>
      </div>
    </MapEngineProvider>
  )
}
