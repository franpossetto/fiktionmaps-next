"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { getUserHomesAction } from "@/lib/homes/home.actions"
import type { UserHome } from "@/src/homes"
import type { City } from "@/src/cities/city.domain"

type HomesContextValue = {
  homes: UserHome[]
  cityMap: Map<string, City>
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  refreshCities: () => void
}

const HomesContext = createContext<HomesContextValue | null>(null)

export function HomesProvider({
  children,
  initialHomes,
  initialCities,
}: {
  children: ReactNode
  initialHomes?: UserHome[]
  initialCities?: City[]
}) {
  const [homes, setHomes] = useState<UserHome[]>(() => initialHomes ?? [])
  const [cityMap, setCityMap] = useState<Map<string, City>>(() =>
    initialCities?.length ? new Map(initialCities.map((c) => [c.id, c])) : new Map()
  )
  const [loading, setLoading] = useState(initialHomes === undefined)
  const [error, setError] = useState<string | null>(null)

  const refreshCities = useCallback(() => {
    fetch("/api/cities")
      .then((res) => res.json())
      .then((data: City[]) => setCityMap(new Map(data.map((c) => [c.id, c]))))
      .catch(() => {})
  }, [])

  const refetch = useCallback(async () => {
    setError(null)
    const result = await getUserHomesAction()
    if (result.data) {
      setHomes(result.data)
    } else if (result.error) {
      setError(result.error)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (initialHomes === undefined) {
      refetch()
    } else {
      setLoading(false)
    }
    if (!initialCities?.length) refreshCities()
  }, [refetch, refreshCities, initialHomes, initialCities?.length])

  const value = useMemo(
    () => ({ homes, cityMap, loading, error, refetch, refreshCities }),
    [homes, cityMap, loading, error, refetch, refreshCities],
  )

  return <HomesContext.Provider value={value}>{children}</HomesContext.Provider>
}

export function useHomes() {
  const ctx = useContext(HomesContext)
  if (!ctx) {
    throw new Error("useHomes must be used within HomesProvider")
  }
  return ctx
}
