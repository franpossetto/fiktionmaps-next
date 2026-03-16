"use client"

import { MapPin, Search } from "lucide-react"
import type { City } from "@/src/cities/city.domain"
import { useApi } from "@/lib/api"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useState, useMemo, useEffect } from "react"

interface CitySelectorProps {
  selectedCity: City
  onCityChange: (city: City) => void
}

export function CitySelector({ selectedCity, onCityChange }: CitySelectorProps) {
  const { cities: citiesService } = useApi()
  const [cities, setCities] = useState<City[]>([])
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")

  useEffect(() => {
    citiesService.getAll().then(setCities)
  }, [citiesService])

  const filtered = useMemo(() => {
    if (!search.trim()) return cities
    const q = search.toLowerCase()
    return cities.filter(
      (c) => c.name.toLowerCase().includes(q) || c.country.toLowerCase().includes(q),
    )
  }, [search, cities])

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v)
        if (!v) setSearch("")
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="gap-2 border-chrome-border bg-chrome/90 text-foreground backdrop-blur-md hover:bg-chrome-hover"
        >
          <MapPin className="h-4 w-4 text-primary" />
          <span>{selectedCity.name}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogTitle className="sr-only">Select city</DialogTitle>
        {/* Search header */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search cities..."
            className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            autoFocus
          />
        </div>

        {/* Results */}
        <div className="max-h-[340px] overflow-y-auto space-y-1 p-3">
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No cities found</p>
          ) : (
            filtered.map((city) => {
              const isActive = selectedCity.id === city.id
              return (
                <button
                  key={city.id}
                  onClick={() => {
                    onCityChange(city)
                    setOpen(false)
                    setSearch("")
                  }}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors ${
                    isActive
                      ? "bg-primary/10 text-foreground"
                      : "text-foreground hover:bg-secondary"
                  }`}
                >
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                      isActive ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div className="flex flex-1 flex-col">
                    <span className="text-sm font-semibold">{city.name}</span>
                    <span className="text-xs text-muted-foreground">{city.country}</span>
                  </div>
                  {isActive && (
                    <div className="h-2 w-2 rounded-full bg-primary" />
                  )}
                </button>
              )
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
