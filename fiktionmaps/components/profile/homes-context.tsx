"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { Loader2, MapPin, Search } from "lucide-react"
import { useTranslations } from "next-intl"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import { addHomeAction, listMyHomesAction } from "@/src/homes/infrastructure/next/home.actions"
import { getAllCitiesAction } from "@/src/cities/infrastructure/next/city.actions"
import type { UserHome } from "@/src/homes/domain/home.entity"
import type { City } from "@/src/cities/domain/city.entity"

type HomesContextValue = {
  homes: UserHome[]
  cityMap: Map<string, City>
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  ensureCity: (city: City) => void
  openHomePicker: () => void
}

const HomesContext = createContext<HomesContextValue | null>(null)

function homesSignature(homes: UserHome[]): string {
  return homes.map((h) => `${h.id}:${h.cityId}:${h.dateTo ?? ""}`).join("|")
}

export function HomesProvider({
  children,
  initialHomes,
  initialCities,
}: {
  children: ReactNode
  initialHomes?: UserHome[]
  initialCities?: City[]
}) {
  const t = useTranslations("Homes")
  const [homes, setHomes] = useState<UserHome[]>(() => initialHomes ?? [])
  const [cityMap, setCityMap] = useState<Map<string, City>>(() =>
    initialCities?.length ? new Map(initialCities.map((c) => [c.id, c])) : new Map(),
  )
  const [loading, setLoading] = useState(initialHomes === undefined)
  const [error, setError] = useState<string | null>(null)
  const clientMutatedRef = useRef(false)
  const lastServerSigRef = useRef(
    initialHomes !== undefined ? homesSignature(initialHomes) : "",
  )

  const [pickerOpen, setPickerOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [cities, setCities] = useState<City[]>([])
  const [citiesLoading, setCitiesLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const ensureCity = useCallback((city: City) => {
    setCityMap((prev) => {
      if (prev.has(city.id)) return prev
      const next = new Map(prev)
      next.set(city.id, city)
      return next
    })
  }, [])

  const refetch = useCallback(async () => {
    setError(null)
    const result = await listMyHomesAction()
    if (result.data) {
      setHomes(result.data)
      clientMutatedRef.current = false
    } else if (result.error) {
      setError(result.error)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (initialHomes === undefined) {
      void refetch()
      return
    }

    const sig = homesSignature(initialHomes)
    if (sig === lastServerSigRef.current) {
      setLoading(false)
      return
    }
    lastServerSigRef.current = sig

    const serverHasCurrent = initialHomes.some((h) => !h.dateTo)
    // Avoid clobbering optimistic client state with a stale empty RSC refresh.
    if (clientMutatedRef.current && !serverHasCurrent) {
      setLoading(false)
      return
    }

    clientMutatedRef.current = false
    setHomes(initialHomes)
    setLoading(false)
  }, [initialHomes, refetch])

  useEffect(() => {
    if (!initialCities?.length) return
    setCityMap((prev) => {
      if (prev.size >= initialCities.length) return prev
      return new Map(initialCities.map((c) => [c.id, c]))
    })
  }, [initialCities])

  const filteredCities = useMemo(() => {
    if (!search.trim()) return cities
    const q = search.toLowerCase()
    return cities.filter(
      (c) => c.name.toLowerCase().includes(q) || c.country.toLowerCase().includes(q),
    )
  }, [search, cities])

  const openHomePicker = useCallback(() => {
    setSaveError(null)
    setSearch("")
    setPickerOpen(true)

    const fromMap = Array.from(cityMap.values())
    if (fromMap.length > 0) {
      setCities(fromMap)
      return
    }

    setCitiesLoading(true)
    void getAllCitiesAction()
      .then((list) => setCities(list))
      .catch(() => setCities([]))
      .finally(() => setCitiesLoading(false))
  }, [cityMap])

  async function handleSelectCity(city: City) {
    if (saving) return
    setSaving(true)
    setSaveError(null)
    try {
      const today = new Date().toISOString().slice(0, 10)
      const result = await addHomeAction({
        cityId: city.id,
        dateFrom: today,
        dateTo: null,
      })
      if (result.error || !result.data) {
        setSaveError(result.error ?? t("addError"))
        return
      }

      ensureCity(city)
      clientMutatedRef.current = true
      setHomes((prev) => [
        result.data!,
        ...prev
          .filter((h) => h.id !== result.data!.id)
          .map((h) => (h.dateTo ? h : { ...h, dateTo: today })),
      ])
      setPickerOpen(false)

      // Fresh read bypasses unstable_cache; ignore empty/stale results.
      const fresh = await listMyHomesAction()
      if (fresh.data?.some((h) => !h.dateTo)) {
        setHomes(fresh.data)
        clientMutatedRef.current = false
      }
    } catch {
      setSaveError(t("addError"))
    } finally {
      setSaving(false)
    }
  }

  const value = useMemo(
    () => ({
      homes,
      cityMap,
      loading,
      error,
      refetch,
      ensureCity,
      openHomePicker,
    }),
    [homes, cityMap, loading, error, refetch, ensureCity, openHomePicker],
  )

  return (
    <HomesContext.Provider value={value}>
      {children}
      <Dialog
        open={pickerOpen}
        onOpenChange={(open) => {
          setPickerOpen(open)
          if (!open) {
            setSearch("")
            setSaveError(null)
          }
        }}
      >
        <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md">
          <DialogTitle className="sr-only">{t("addHomeTitle")}</DialogTitle>
          <div className="border-b border-border px-4 py-3">
            <p className="text-sm font-semibold text-foreground">{t("addHomeTitle")}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{t("addHomeHint")}</p>
          </div>
          <div className="flex items-center gap-3 border-b border-border px-4 py-3">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("searchCities")}
              className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              autoFocus
              disabled={saving}
            />
          </div>
          <div className="max-h-[340px] space-y-1 overflow-y-auto p-3">
            {citiesLoading ? (
              <p className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                {t("loading")}
              </p>
            ) : filteredCities.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">{t("noCitiesFound")}</p>
            ) : (
              filteredCities.map((city) => (
                <button
                  key={city.id}
                  type="button"
                  disabled={saving}
                  onClick={() => void handleSelectCity(city)}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-foreground transition-colors hover:bg-secondary disabled:opacity-60"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
                    <MapPin className="h-5 w-5" aria-hidden />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-semibold">{city.name}</span>
                    <span className="truncate text-xs text-muted-foreground">{city.country}</span>
                  </div>
                  {saving ? (
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" aria-hidden />
                  ) : null}
                </button>
              ))
            )}
          </div>
          {saveError ? (
            <p className="border-t border-border px-4 py-3 text-sm text-destructive">{saveError}</p>
          ) : null}
        </DialogContent>
      </Dialog>
    </HomesContext.Provider>
  )
}

export function useHomes() {
  const ctx = useContext(HomesContext)
  if (!ctx) {
    throw new Error("useHomes must be used within HomesProvider")
  }
  return ctx
}
