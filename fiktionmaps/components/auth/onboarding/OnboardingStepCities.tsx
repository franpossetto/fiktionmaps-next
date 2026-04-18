"use client"

import { Check, MapPin } from "lucide-react"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"
import type { City } from "@/src/cities/domain/city.entity"

export interface OnboardingStepCitiesProps {
  cities: City[]
  selectedCities: string[]
  maxSelection: number
  onToggleCity: (id: string) => void
}

export function OnboardingStepCities({
  cities,
  selectedCities,
  maxSelection,
  onToggleCity,
}: OnboardingStepCitiesProps) {
  const t = useTranslations("Onboarding")

  return (
    <div className="flex w-full flex-col items-center">
      <div className="mb-12 w-full text-center">
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl md:text-6xl">
          {t("step6Title")}
        </h1>
        <p className="mt-4 text-lg text-muted-foreground sm:text-xl">
          {t("step6Subtitle")}
        </p>
      </div>
      <div className="w-full flex flex-wrap gap-2 justify-center">
        {cities.map((city) => {
          const active = selectedCities.includes(city.id)
          return (
            <button
              key={city.id}
              onClick={() => onToggleCity(city.id)}
              className={cn(
                "flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                active
                  ? "border-foreground bg-foreground text-background"
                  : "bg-muted border-border text-muted-foreground"
              )}
              title={`${city.name}${city.country ? `, ${city.country}` : ""}`}
            >
              <MapPin className="h-4 w-4 shrink-0" />
              <span className="truncate max-w-[10rem]">
                {city.name}
                {city.country ? `, ${city.country}` : ""}
              </span>
              <span className="inline-flex h-3 w-3 items-center justify-center">
                <Check className={cn("h-3 w-3 transition-opacity", active ? "opacity-100" : "opacity-0")} />
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
