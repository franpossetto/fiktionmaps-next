"use client"

import { createContext, useContext } from "react"

const MapLoadedContext = createContext<boolean>(false)

export function useMapLoaded(): boolean {
  return useContext(MapLoadedContext)
}

export const MapLoadedProvider = MapLoadedContext.Provider
