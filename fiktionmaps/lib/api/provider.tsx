"use client"

import { createContext, useContext, useMemo, type ReactNode } from "react"
import { createServices } from "./registry"
import type { ApiServices } from "./types"

const ApiContext = createContext<ApiServices | null>(null)

export function ApiProvider({ children }: { children: ReactNode }) {
  const services = useMemo(() => createServices(), [])
  return <ApiContext.Provider value={services}>{children}</ApiContext.Provider>
}

export function useApi(): ApiServices {
  const ctx = useContext(ApiContext)
  if (!ctx) throw new Error("useApi must be used within ApiProvider")
  return ctx
}
