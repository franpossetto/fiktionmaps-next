"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react"
import { motion } from "framer-motion"
import type { City } from "@/modules/cities/city.domain"
import { Button } from "@/components/ui/button"
import { updateCityAction } from "@/app/(app)/admin/actions"
import Link from "next/link"
import { CityMapPicker } from "./city-map-picker"

interface CityEditViewProps {
  initialCity: City
}

function toFormState(c: City) {
  return {
    name: c.name,
    country: c.country,
    lat: String(c.lat),
    lng: String(c.lng),
    zoom: String(c.zoom),
  }
}

const stepVariants = {
  initial: { opacity: 0, x: 40, filter: "blur(6px)" },
  animate: { opacity: 1, x: 0, filter: "blur(0px)" },
  exit: { opacity: 0, x: -40, filter: "blur(6px)" },
}

export function CityEditView({ initialCity }: CityEditViewProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const initialForm = useMemo(() => toFormState(initialCity), [initialCity])
  const [formData, setFormData] = useState(initialForm)

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!formData.name.trim()) newErrors.name = "Name is required"
    if (!formData.country.trim()) newErrors.country = "Country is required"
    const lat = parseFloat(formData.lat)
    const lng = parseFloat(formData.lng)
    const zoom = parseInt(formData.zoom, 10)
    if (Number.isNaN(lat) || lat < -90 || lat > 90) newErrors.lat = "Latitude must be -90 to 90"
    if (Number.isNaN(lng) || lng < -180 || lng > 180) newErrors.lng = "Longitude must be -180 to 180"
    if (Number.isNaN(zoom) || zoom < 0 || zoom > 22) newErrors.zoom = "Zoom must be 0–22"
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const doSave = async () => {
    if (!validate()) return
    setSaving(true)
    setErrors({})
    const fd = new FormData()
    fd.set("name", formData.name.trim())
    fd.set("country", formData.country.trim())
    fd.set("lat", formData.lat)
    fd.set("lng", formData.lng)
    fd.set("zoom", formData.zoom)
    const result = await updateCityAction(initialCity.id, fd)
    setSaving(false)
    if (result.success) {
      router.push("/admin?tab=cities")
      router.refresh()
    } else {
      setErrors({ submit: result.error })
    }
  }

  return (
    <>
      <motion.div
        key="city-edit"
        variants={stepVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="fixed inset-0 bottom-[70px] md:bottom-0 md:left-[60px] z-[3000] bg-background flex flex-col overflow-y-auto"
      >
        {/* Header */}
        <div className="px-4 sm:px-6 pt-6 pb-4">
          <Link
            href="/admin?tab=cities"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground mb-3"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Cities
          </Link>
          <h1 className="font-sans text-2xl font-bold text-foreground">
            Edit city
          </h1>
          <p className="font-sans text-sm text-muted-foreground mt-1">
            {formData.name || initialCity.name}
          </p>
        </div>

        {/* Full-width map */}
        <div className="flex flex-col w-full flex-1 min-h-0">
          <CityMapPicker
              mapKeySuffix={`edit-${initialCity.id}`}
              center={{
                lat: parseFloat(formData.lat) || initialCity.lat,
                lng: parseFloat(formData.lng) || initialCity.lng,
              }}
              zoom={parseInt(formData.zoom, 10) || initialCity.zoom}
              onCenterChange={(lat, lng) =>
                setFormData((p) => ({ ...p, lat: String(lat), lng: String(lng) }))
              }
              onZoomChange={(zoom) => setFormData((p) => ({ ...p, zoom: String(zoom) }))}
              onCitySelect={(_, __, name, country) =>
                setFormData((p) => ({ ...p, name, country }))
              }
              cityName={formData.name}
              cityCountry={formData.country}
              showSearch
              onError={(msg) => setErrors((p) => (msg ? { ...p, map: msg } : { ...p, map: "" }))}
            />
        </div>
      </motion.div>

      {/* Fixed bottom bar */}
      <div className="fixed bottom-[70px] left-0 right-0 md:bottom-0 md:left-[60px] z-[3001] border-t border-border bg-background px-4 sm:px-6 py-4">
        {errors.map && (
          <p className="mb-3 text-sm text-red-500 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2">
            {errors.map}
          </p>
        )}
        {errors.submit && (
          <p className="mb-3 text-center text-sm text-destructive">{errors.submit}</p>
        )}
        <div className="flex items-center justify-between gap-4">
          <Link href="/admin?tab=cities">
            <Button type="button" variant="outline" className="rounded-xl px-6">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </Link>
          <Button
            type="button"
            disabled={saving}
            variant="cta"
            className="gap-2 rounded-xl px-6"
            onClick={doSave}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save changes
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </>
  )
}
