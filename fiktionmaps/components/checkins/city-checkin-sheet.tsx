"use client"

import { useEffect, useRef, useState } from "react"
import { MapPin, X, Loader2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { motion, AnimatePresence } from "framer-motion"
import { MAPBOX_ACCESS_TOKEN } from "@/lib/map/mapbox/styles"
import { useGeo } from "./geo-provider"
import { checkinCityAction } from "@/lib/actions/checkins/checkin.actions"

function staticMapUrl(lat: number, lng: number): string {
  if (!MAPBOX_ACCESS_TOKEN) return ""
  return `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-s+ef4444(${lng},${lat})/${lng},${lat},12,0/240x240@2x?access_token=${MAPBOX_ACCESS_TOKEN}&logo=false&attribution=false`
}

const AUTO_DISMISS_MS = 12_000

export function CityCheckinSheet() {
  const t = useTranslations("Checkins")
  const { pendingCityCheckin, dismissCityCheckin, lat, lng } = useGeo()
  const [loading, setLoading] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Auto-dismiss after a few seconds so it's non-invasive
  useEffect(() => {
    if (!pendingCityCheckin) return
    timerRef.current = setTimeout(dismissCityCheckin, AUTO_DISMISS_MS)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [pendingCityCheckin, dismissCityCheckin])

  const handleConfirm = async () => {
    if (!pendingCityCheckin) return
    if (timerRef.current) clearTimeout(timerRef.current)
    setLoading(true)
    try {
      await checkinCityAction(pendingCityCheckin.id, lat, lng, "auto")
    } finally {
      setLoading(false)
      dismissCityCheckin()
    }
  }

  const city = pendingCityCheckin

  return (
    <AnimatePresence>
      {city && (
        <motion.div
          key="city-checkin-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="fixed bottom-24 md:bottom-6 right-4 md:right-6 z-[1000] w-[min(360px,calc(100%-2rem))]"
        >
          <div className="relative flex overflow-hidden rounded-2xl border border-border bg-card shadow-lg">
            {/* Text content -- left side */}
            <div className="flex-1 px-4 py-4 pr-2 min-w-0">
              <p className="text-[13px] font-semibold text-foreground leading-snug">
                {t("cityPromptTitle", { city: city.name })}
              </p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                {t("cityPromptDescription")}
              </p>

              <button
                onClick={handleConfirm}
                disabled={loading}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-60"
              >
                {loading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <MapPin className="h-3 w-3" />
                )}
                {loading ? t("saving") : t("confirmCheckin")}
              </button>
            </div>

            {/* Map thumbnail -- right side */}
            <div className="w-[120px] shrink-0 overflow-hidden bg-muted">
              {MAPBOX_ACCESS_TOKEN ? (
                <img
                  src={staticMapUrl(city.lat, city.lng)}
                  alt={city.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <MapPin className="h-6 w-6 text-muted-foreground/30" />
                </div>
              )}
            </div>

            {/* Dismiss */}
            <button
              onClick={() => {
                if (timerRef.current) clearTimeout(timerRef.current)
                dismissCityCheckin()
              }}
              className="absolute top-2 right-2 rounded-full p-1 text-muted-foreground/60 transition-colors hover:text-foreground hover:bg-muted"
              aria-label={t("dismiss")}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
