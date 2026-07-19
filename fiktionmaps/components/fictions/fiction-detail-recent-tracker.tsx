"use client"

import { useEffect } from "react"
import { localStorageService } from "@/lib/local-storage-service"

/** Side-effect only: record fiction in recent list (does not render UI). */
export function FictionDetailRecentTracker({
  fictionId,
  fictionSlug,
}: {
  fictionId: string
  fictionSlug: string
}) {
  useEffect(() => {
    localStorageService.recentFictions.add({ id: fictionId, slug: fictionSlug })
  }, [fictionId, fictionSlug])

  return null
}
