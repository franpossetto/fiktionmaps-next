"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { ExternalLink, MapPin } from "lucide-react"
import { useTranslations } from "next-intl"
import { getPlaceUrlAction } from "@/src/places/infrastructure/next/place.actions"

interface DuplicateOf {
  id: string
  name: string
  image: string | null
}

export interface HuntDuplicateBannerProps {
  newPlace: {
    name: string
  }
  duplicateOf: DuplicateOf
}

export function HuntDuplicateBanner({ duplicateOf }: HuntDuplicateBannerProps) {
  const t = useTranslations("Contribute.huntReview")
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    getPlaceUrlAction(duplicateOf.id).then((resolved) => {
      if (resolved) setUrl(resolved)
    })
  }, [duplicateOf.id])

  return (
    <div className="flex w-full items-center gap-3 rounded-xl border border-border/60 bg-muted/40 px-3 py-2.5">
      <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-md bg-muted">
        {duplicateOf.image ? (
          <Image src={duplicateOf.image} alt={duplicateOf.name} fill className="object-cover" sizes="36px" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <MapPin className="h-3.5 w-3.5 text-muted-foreground/40" aria-hidden />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          {t("duplicateBannerKicker")}
        </p>
        <p className="truncate text-sm font-medium text-foreground">{duplicateOf.name}</p>
      </div>

      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          {t("duplicateVisit")}
        </a>
      ) : (
        <span className="shrink-0 text-xs text-muted-foreground/40">{t("duplicateVisit")}</span>
      )}
    </div>
  )
}
