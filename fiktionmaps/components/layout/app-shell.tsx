"use client"

import dynamic from "next/dynamic"
import { AppFloatingNav } from "@/components/layout/app-floating-nav"
import { AppTopNavbar, AppTopNavbarNoSearch } from "@/components/layout/app-top-navbar"
import { GeoProvider } from "@/components/checkins/geo-provider"
import { usePathname } from "@/i18n/navigation"

const CityCheckinSheet = dynamic(
  () =>
    import("@/components/checkins/city-checkin-sheet").then((m) => ({
      default: m.CityCheckinSheet,
    })),
  { ssr: false },
)

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isMapView = pathname?.startsWith("/map")
  const isContributeFlow = pathname != null && /(^|\/)contribute(\/|$)/.test(pathname)
  const isNoSearchNavbar = isContributeFlow || pathname === "/"

  return (
    <GeoProvider>
      <div className="flex h-screen w-screen overflow-hidden">
        <main className="relative flex-1 min-w-0 overflow-hidden">
          {isMapView ? (
            children
          ) : (
            <div className="flex h-full flex-col">
              {isNoSearchNavbar ? <AppTopNavbarNoSearch /> : <AppTopNavbar />}
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
  )
}
