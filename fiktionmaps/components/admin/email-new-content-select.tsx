"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react"
import { Link, useRouter } from "@/i18n/navigation"
import { Button } from "@/components/ui/button"
import { AppDetailRailsShell } from "@/components/layout/app-detail-rails-shell"
import type { City } from "@/src/cities/domain/city.entity"
import { getCityFictionsAction } from "@/src/cities/infrastructure/next/city.actions"
import { getCityPlacesAction } from "@/src/places/infrastructure/next/place.actions"
import { cn } from "@/lib/utils"

type PlaceOption = {
  id: string
  name: string
  fictionTitle: string
  imageUrl: string | null
}

type EmailNewContentSelectProps = {
  cities: City[]
}

function placeThumb(url: string | null | undefined): string | null {
  const trimmed = url?.trim()
  if (!trimmed || trimmed.includes("placeholder")) return null
  return trimmed
}

export function EmailNewContentSelect({ cities }: EmailNewContentSelectProps) {
  const router = useRouter()
  const [cityId, setCityId] = useState("")
  const [placeOptions, setPlaceOptions] = useState<PlaceOption[]>([])
  const [selectedPlaceIds, setSelectedPlaceIds] = useState<string[]>([])
  const [loadingPlaces, setLoadingPlaces] = useState(false)
  const [placesError, setPlacesError] = useState<string | null>(null)

  const selectedCity = useMemo(
    () => cities.find((c) => c.id === cityId) ?? null,
    [cities, cityId],
  )

  const loadPlaces = useCallback(async (nextCityId: string) => {
    if (!nextCityId) {
      setPlaceOptions([])
      setPlacesError(null)
      return
    }
    setLoadingPlaces(true)
    setPlacesError(null)
    try {
      const [places, fictions] = await Promise.all([
        getCityPlacesAction(nextCityId),
        getCityFictionsAction(nextCityId),
      ])
      const titles = new Map(fictions.map((f) => [f.id, f.title]))
      setPlaceOptions(
        places.map((place) => ({
          id: place.id,
          name: place.name,
          fictionTitle: titles.get(place.fictionId) || "Ficción",
          imageUrl: placeThumb(place.image),
        })),
      )
    } catch (e) {
      setPlaceOptions([])
      setPlacesError(e instanceof Error ? e.message : "No se pudieron cargar los lugares")
    } finally {
      setLoadingPlaces(false)
    }
  }, [])

  useEffect(() => {
    void loadPlaces(cityId)
  }, [cityId, loadPlaces])

  const onCityChange = (nextCityId: string) => {
    setCityId(nextCityId)
    setSelectedPlaceIds([])
  }

  const togglePlace = (placeId: string) => {
    setSelectedPlaceIds((prev) =>
      prev.includes(placeId) ? prev.filter((id) => id !== placeId) : [...prev, placeId],
    )
  }

  const canContinue = Boolean(cityId) && selectedPlaceIds.length > 0

  const onContinue = () => {
    if (!canContinue) return
    const params = new URLSearchParams()
    params.set("cityId", cityId)
    params.set("places", selectedPlaceIds.join(","))
    router.push(`/admin/emails/new/new-content/preview?${params.toString()}`)
  }

  return (
    <AppDetailRailsShell>
      <div className="flex min-h-0 flex-1 flex-col">
        <header className="flex h-[60px] shrink-0 items-center gap-3 border-b border-border px-5">
          <Link
            href="/admin/emails/new"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Volver a templates"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold text-foreground">New content</h1>
            <p className="truncate text-xs text-muted-foreground">Elegí ciudad y lugares</p>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6">
          <div className="mx-auto w-full max-w-2xl space-y-8">
            <section className="space-y-3">
              <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Ciudad
              </h2>
              <select
                value={cityId}
                onChange={(e) => onCityChange(e.target.value)}
                className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-foreground/40"
              >
                <option value="">Seleccionar ciudad…</option>
                {cities.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.name}
                    {city.country ? ` · ${city.country}` : ""}
                  </option>
                ))}
              </select>
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Lugares
                </h2>
                {placeOptions.length > 0 ? (
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedPlaceIds(placeOptions.map((p) => p.id))}
                      className="text-[11px] text-muted-foreground hover:text-foreground"
                    >
                      Todos
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedPlaceIds([])}
                      className="text-[11px] text-muted-foreground hover:text-foreground"
                    >
                      Ninguno
                    </button>
                  </div>
                ) : null}
              </div>

              {!cityId ? (
                <p className="text-sm text-muted-foreground">Elegí una ciudad para ver lugares.</p>
              ) : loadingPlaces ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Cargando…
                </div>
              ) : placesError ? (
                <p className="text-sm text-red-500">{placesError}</p>
              ) : placeOptions.length === 0 ? (
                <p className="text-sm text-muted-foreground">Esta ciudad no tiene lugares.</p>
              ) : (
                <ul className="space-y-2">
                  {placeOptions.map((place) => {
                    const checked = selectedPlaceIds.includes(place.id)
                    return (
                      <li key={place.id}>
                        <label
                          className={cn(
                            "flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors",
                            checked
                              ? "border-foreground/30 bg-muted/50"
                              : "border-border hover:bg-muted/30",
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => togglePlace(place.id)}
                            className="h-4 w-4 shrink-0 accent-foreground"
                          />
                          {place.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={place.imageUrl}
                              alt=""
                              className="h-12 w-[4.5rem] shrink-0 rounded object-cover"
                            />
                          ) : (
                            <span className="h-12 w-[4.5rem] shrink-0 rounded bg-muted" />
                          )}
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-foreground">
                              {place.name}
                            </span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {place.fictionTitle}
                              {selectedCity ? ` · ${selectedCity.name}` : ""}
                            </span>
                          </span>
                        </label>
                      </li>
                    )
                  })}
                </ul>
              )}

              {selectedPlaceIds.length > 0 ? (
                <p className="text-xs text-muted-foreground">
                  {selectedPlaceIds.length} seleccionado
                  {selectedPlaceIds.length === 1 ? "" : "s"}
                  {selectedPlaceIds.length > 3
                    ? " · el mail muestra 3 y el resto como “y N más”"
                    : ""}
                </p>
              ) : null}
            </section>
          </div>
        </div>

        <footer className="relative z-10 shrink-0 bg-background">
          <div className="h-px w-full bg-border/60" aria-hidden />
          <div className="grid w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-2 px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <div className="flex min-w-0 justify-start">
              <Link
                href="/admin/emails/new"
                className="inline-flex min-h-9 max-w-full shrink-0 items-center gap-1.5 text-sm text-muted-foreground transition-opacity hover:opacity-70"
              >
                <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
                <span className="truncate">Back</span>
              </Link>
            </div>
            <span className="block min-h-[1.25rem] w-px shrink-0" aria-hidden />
            <div className="flex min-w-0 justify-end">
              <Button
                type="button"
                variant={canContinue ? "default" : "outline"}
                disabled={!canContinue}
                onClick={onContinue}
                className={cn(
                  "h-9 w-fit shrink-0 rounded-lg px-4 text-sm font-medium",
                  !canContinue && "border border-border bg-background hover:bg-muted",
                )}
              >
                Continuar
                <ArrowRight className="ml-2 h-4 w-4 shrink-0" aria-hidden />
              </Button>
            </div>
          </div>
        </footer>
      </div>
    </AppDetailRailsShell>
  )
}
