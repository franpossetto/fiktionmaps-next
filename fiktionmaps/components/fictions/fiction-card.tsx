"use client"

import { useState } from "react"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import type { FictionWithMedia } from "@/src/fictions/fiction.domain"
import { Link } from "@/i18n/navigation"
import { DEFAULT_FICTION_COVER } from "@/lib/constants/placeholders"

interface FictionCardProps {
  fiction: FictionWithMedia
  locationCount: number
  /** When set, the card is a link to this URL (SEO-friendly, shareable). */
  href?: string
  onClick?: () => void
}

export function FictionCard({ fiction, locationCount, href, onClick }: FictionCardProps) {
  const [coverError, setCoverError] = useState(false)
  const coverSrc = fiction.coverImage?.trim() || DEFAULT_FICTION_COVER
  const showPlaceholder = coverError || !fiction.coverImage?.trim()

  const content = (
    <>
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-lg transition-all duration-300 group-hover:shadow-lg group-hover:shadow-primary/5">
        <Image
          src={showPlaceholder ? DEFAULT_FICTION_COVER : coverSrc}
          alt={fiction.title}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 20vw"
          onError={() => setCoverError(true)}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        <div className="absolute bottom-0 left-0 right-0 flex items-center gap-2 p-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <span className="text-xs font-medium text-foreground">
            {locationCount} location{locationCount > 1 ? "s" : ""}
          </span>
        </div>
        <div className="absolute right-2 top-2">
          <Badge
            variant="secondary"
            className="bg-background/70 px-1.5 py-0 text-[10px] backdrop-blur-sm"
          >
            {fiction.type === "tv-series" ? "TV" : fiction.type}
          </Badge>
        </div>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-foreground transition-colors group-hover:text-primary">
          {fiction.title}
        </h3>
        <p className="text-xs text-muted-foreground">
          {fiction.year} &middot; {fiction.genre}
        </p>
      </div>
    </>
  )

  const className = "group flex flex-col gap-2 text-left"
  if (href) {
    return (
      <Link href={href} className={className} aria-label={fiction.title}>
        {content}
      </Link>
    )
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  )
}
