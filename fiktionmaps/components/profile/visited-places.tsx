"use client"

import { useEffect, useState } from "react"
import type { Location } from "@/src/locations"
import type { Fiction } from "@/src/fictions/fiction.domain"
import { useApi } from "@/lib/api"
import { MapPin, Heart } from "lucide-react"
import Image from "next/image"

interface VisitedPlacesProps {
  locations: Location[]
  favorites: string[]
  onLocationClick?: (location: Location) => void
}

export function VisitedPlaces({ locations, favorites, onLocationClick }: VisitedPlacesProps) {
  const { fictions } = useApi()
  const [fictionMap, setFictionMap] = useState<Map<string, Fiction>>(new Map())

  useEffect(() => {
    fictions.getAll().then((all) => setFictionMap(new Map(all.map((f) => [f.id, f]))))
  }, [fictions])

  if (locations.length === 0) {
    return (
      <div className="text-center py-12 px-6">
        <MapPin className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-muted-foreground">No visited locations yet. Start exploring!</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {locations.map((location) => {
        const fiction = fictionMap.get(location.fictionId)
        const isFavorite = favorites.includes(location.id)

        return (
          <div
            key={location.id}
            role="button"
            tabIndex={0}
            onClick={() => onLocationClick?.(location)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onLocationClick?.(location) }}
            className="group relative rounded-xl overflow-hidden border border-border hover:border-cyan-500/50 transition-all hover:shadow-lg hover:shadow-cyan-500/10 cursor-pointer"
          >
            {/* Image */}
            <div className="relative h-48 w-full overflow-hidden bg-muted">
              <Image
                src={location.image}
                alt={location.name}
                fill
                className="object-cover group-hover:scale-110 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
            </div>

            {/* Content overlay */}
            <div className="absolute inset-0 p-4 flex flex-col justify-between">
              {/* Favorite button */}
              <div className="self-end">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    console.log("Toggle favorite:", location.id)
                  }}
                  className={`p-2 rounded-lg backdrop-blur-sm transition-all ${
                    isFavorite
                      ? "bg-red-500/30 text-red-400 border border-red-500/50"
                      : "bg-background/30 text-muted-foreground hover:text-red-400 border border-background/50 hover:border-red-500/50"
                  }`}
                >
                  <Heart className={`h-4 w-4 ${isFavorite ? "fill-current" : ""}`} />
                </button>
              </div>

              {/* Info */}
              <div className="space-y-2">
                <h3 className="font-bold text-foreground text-base line-clamp-2">{location.name}</h3>
                {fiction && (
                  <p className="text-sm text-cyan-300/80 font-medium">{fiction.title}</p>
                )}
                <p className="text-sm text-muted-foreground line-clamp-1 flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {location.address}
                </p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
