"use client"

import { useEffect, useRef, useState } from "react"
import { useTranslations } from "next-intl"
import { Loader2 } from "lucide-react"
import type { StreetViewReference } from "@/src/locations/domain/location-view-reference.schemas"
import { isGoogleMapsConfigured, loadGoogleMaps } from "@/lib/google-maps/load-google-maps"
import { streetViewFovToZoom } from "@/lib/google-maps/street-view-zoom-fov"
import { cn } from "@/lib/utils"

export interface StreetViewReferencePreviewProps {
  reference: StreetViewReference
  className?: string
}

type PreviewState = "loading" | "ready" | "error" | "missing_key"

export function StreetViewReferencePreview({ reference, className }: StreetViewReferencePreviewProps) {
  const t = useTranslations("Contributions")
  const panoramaRef = useRef<HTMLDivElement>(null)
  const [state, setState] = useState<PreviewState>(() =>
    isGoogleMapsConfigured() ? "loading" : "missing_key",
  )

  useEffect(() => {
    if (!isGoogleMapsConfigured() || !panoramaRef.current) return

    let cancelled = false

    void (async () => {
      try {
        const googleMaps = await loadGoogleMaps()
        if (cancelled || !panoramaRef.current) return

        const panorama = new googleMaps.maps.StreetViewPanorama(panoramaRef.current, {
          disableDefaultUI: true,
          clickToGo: false,
          scrollwheel: false,
          addressControl: false,
          linksControl: false,
          panControl: false,
          zoomControl: false,
          fullscreenControl: false,
          motionTracking: false,
          motionTrackingControl: false,
          enableCloseButton: false,
        })

        if (reference.panoId) {
          panorama.setPano(reference.panoId)
        }
        panorama.setPosition({ lat: reference.latitude, lng: reference.longitude })
        panorama.setPov({ heading: reference.heading, pitch: reference.pitch })
        panorama.setZoom(streetViewFovToZoom(reference.fov))
        setState("ready")
      } catch {
        if (!cancelled) setState("error")
      }
    })()

    return () => {
      cancelled = true
    }
  }, [reference])

  return (
    <div
      className={cn(
        "relative aspect-video min-h-[min(52vw,280px)] w-full overflow-hidden rounded-xl border border-border bg-muted/30 sm:min-h-[320px]",
        className,
      )}
    >
      <div ref={panoramaRef} className="absolute inset-0" />
      {state === "loading" ? (
        <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-[1px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden />
        </div>
      ) : null}
      {state === "missing_key" || state === "error" ? (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/80 px-4 text-center text-sm text-muted-foreground">
          {t("streetViewPreviewUnavailable")}
        </div>
      ) : null}
    </div>
  )
}
