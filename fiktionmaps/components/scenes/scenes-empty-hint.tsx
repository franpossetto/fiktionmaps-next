"use client"

import { MapPin } from "lucide-react"
import type { City } from "@/src/cities/city.domain"

interface ScenesEmptyHintProps {
  otherCitiesWithScenes: Pick<City, "id" | "name" | "country">[]
  onPickCity: (city: City) => void
  cities: City[]
  variant: "scoped" | "global"
}

export function ScenesEmptyHint({
  otherCitiesWithScenes,
  onPickCity,
  cities,
  variant,
}: ScenesEmptyHintProps) {
  if (otherCitiesWithScenes.length === 0) return null

  const title =
    variant === "global"
      ? "Cities with scenes in the catalog"
      : "Scenes for this fiction are in another city"

  return (
    <div className="flex max-w-md flex-col items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-4 py-3 text-center">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <MapPin className="h-4 w-4 shrink-0 text-primary" aria-hidden />
        <span>{title}</span>
      </div>
      <p className="text-sm text-muted-foreground">
        {variant === "global"
          ? "This city has no fictions with scenes yet. Try "
          : "Switch to "}
        {otherCitiesWithScenes.map((c, i) => {
          const full = cities.find((x) => x.id === c.id)
          const label = `${c.name}${c.country ? `, ${c.country}` : ""}`
          return (
            <span key={c.id}>
              {i > 0 && (i === otherCitiesWithScenes.length - 1 ? " or " : ", ")}
              {full ? (
                <button
                  type="button"
                  onClick={() => onPickCity(full)}
                  className="font-medium text-primary underline underline-offset-2 hover:text-primary/90"
                >
                  {label}
                </button>
              ) : (
                <span className="font-medium">{label}</span>
              )}
            </span>
          )
        })}
        .
      </p>
    </div>
  )
}
