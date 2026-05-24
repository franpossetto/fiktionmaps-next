"use client"

import Image from "next/image"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"

export interface PlaceContributeReferencePhotoAsideProps {
  previewUrl: string | null
  className?: string
}

/** Reference photo for Street View comparison — lives in the layout right rail, not the main column. */
export function PlaceContributeReferencePhotoAside({
  previewUrl,
  className,
}: PlaceContributeReferencePhotoAsideProps) {
  const t = useTranslations("Contribute.place")

  return (
    <div className={cn("w-full min-w-0", className)}>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {t("streetViewPhotoLabel")}
      </p>
      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{t("streetViewPhotoRailHelp")}</p>
      <div className="mt-3 overflow-hidden rounded-xl border border-border/60 bg-muted/15 p-2">
        <div className="relative aspect-[21/9] w-full overflow-hidden rounded-lg border border-border/50 bg-muted/30">
          {previewUrl ? (
            <Image
              src={previewUrl}
              alt={t("photoPreviewAlt")}
              fill
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="flex h-full min-h-[4rem] items-center justify-center px-2 text-center text-xs leading-snug text-muted-foreground">
              {t("streetViewNoPhoto")}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
