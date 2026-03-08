"use client"

import { useEffect } from "react"
import { useMapControl } from "@/lib/map"

const TILT_3D = 60
const HEADING_3D = 320
const ZOOM_3D_MIN = 16

interface Map3DToggleProps {
  is3D: boolean
  onToggle: (is3D: boolean) => void
  cityId?: string
}

export function Map3DToggle({ is3D, onToggle, cityId }: Map3DToggleProps) {
  const mapControl = useMapControl()

  // When city changes while in 3D, restore 3D view (tilt, heading, zoom 18)
  useEffect(() => {
    if (!is3D || !mapControl?.easeTo || cityId == null) return
    mapControl.easeTo({
      tilt: TILT_3D,
      heading: HEADING_3D,
      zoom: ZOOM_3D_MIN,
      duration: 800,
    })
  }, [cityId, mapControl])

  const handleToggle = () => {
    if (!mapControl) return

    if (!is3D) {
      const currentZoom = mapControl.getZoom() ?? ZOOM_3D_MIN
      const targetZoom = Math.max(currentZoom, ZOOM_3D_MIN)
      if (mapControl.easeTo) {
        mapControl.easeTo({ tilt: TILT_3D, heading: HEADING_3D, zoom: targetZoom, duration: 1200 })
      } else {
        mapControl.setZoom(targetZoom)
        mapControl.setTilt?.(TILT_3D)
        mapControl.setHeading?.(HEADING_3D)
      }
      onToggle(true)
    } else {
      if (mapControl.easeTo) {
        mapControl.easeTo({ tilt: 0, heading: 0, duration: 1200 })
      } else {
        mapControl.setTilt?.(0)
        mapControl.setHeading?.(0)
      }
      onToggle(false)
    }
  }

  return (
    <button
      onClick={handleToggle}
      className={`flex h-9 w-9 items-center justify-center rounded-lg border backdrop-blur-md transition-all ${
        is3D
          ? "border-primary/50 bg-primary/20 text-primary shadow-[0_0_0_2px_hsl(36_90%_55%/0.15)]"
          : "border-chrome-border bg-chrome/90 text-foreground hover:bg-chrome-hover"
      }`}
      title={is3D ? "Switch to 2D view" : "Switch to 3D view"}
      aria-label={is3D ? "Switch to 2D view" : "Switch to 3D view"}
    >
      {is3D ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0" aria-hidden>
          <rect x="3" y="3" width="18" height="18" rx="1" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0" aria-hidden>
          <path d="M12 2L22 8v8l-10 6-10-6V8L12 2z" />
          <path d="M12 2v12M22 8l-10 6M2 8l10 6" />
        </svg>
      )}
    </button>
  )
}
