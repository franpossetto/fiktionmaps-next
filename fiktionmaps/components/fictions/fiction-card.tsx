"use client"

import { useState } from "react"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import type { FictionWithMedia } from "@/src/fictions/domain/fiction.entity"
import { Link } from "@/i18n/navigation"
import { DEFAULT_FICTION_COVER } from "@/lib/constants/placeholders"
import { ThumbsUp } from "lucide-react"

interface FictionCardProps {
  fiction: FictionWithMedia
  locationCount: number
  /** Video scenes (movie / TV); optional for backwards compatibility. */
  sceneCount?: number
  /** When set, the card is a link to this URL (SEO-friendly, shareable). */
  href?: string
  onClick?: () => void
  likeCount?: number
  liked?: boolean
  onToggleLike?: (fictionId: string) => void
}

export function FictionCard({
  fiction,
  locationCount,
  sceneCount = 0,
  href,
  onClick,
  likeCount,
  liked = false,
  onToggleLike,
}: FictionCardProps) {
  const [coverError, setCoverError] = useState(false)
  const coverSrc = fiction.coverImage?.trim() || DEFAULT_FICTION_COVER
  const showPlaceholder = coverError || !fiction.coverImage?.trim()

  const content = (
    <>
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-md transition-all duration-300 group-hover:shadow-lg group-hover:shadow-primary/5">
        <Image
          src={showPlaceholder ? DEFAULT_FICTION_COVER : coverSrc}
          alt={fiction.title}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 20vw"
          onError={() => setCoverError(true)}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        <div className="absolute bottom-0 left-0 right-0 flex flex-wrap items-center gap-x-2 gap-y-0.5 p-2 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <span className="text-xs font-medium text-foreground">
            {locationCount} location{locationCount > 1 ? "s" : ""}
          </span>
          {(fiction.type === "movie" || fiction.type === "tv-series") && sceneCount > 0 && (
            <span className="text-xs font-medium text-foreground">
              {sceneCount} scene{sceneCount > 1 ? "s" : ""}
            </span>
          )}
        </div>
        <div className="absolute right-2 top-2 flex items-center gap-2">
          <Badge variant="secondary" className="bg-background/70 px-1.5 py-0 text-[10px] backdrop-blur-sm">
            {fiction.type === "tv-series" ? "TV" : fiction.type}
          </Badge>
        </div>
      </div>
      <div>
        <h3 className="text-xs font-semibold text-foreground transition-colors group-hover:text-primary">
          {fiction.title}
        </h3>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <p className="text-[11px] text-muted-foreground">
            {fiction.year} &middot; {fiction.genre}
          </p>
          {onToggleLike && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onToggleLike(fiction.id)
              }}
              className="flex items-center gap-1 rounded-full px-1 py-0.5 text-[11px] text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
              aria-label={liked ? "Unlike fiction" : "Like fiction"}
              title={liked ? "You like this fiction" : "Like this fiction"}
            >
              <ThumbsUp
                className={`h-4 w-4 transition-colors ${liked ? "text-foreground" : "text-muted-foreground"}`}
                fill={liked ? "currentColor" : "transparent"}
              />
              <span className="text-[10px] font-semibold text-foreground/90">{likeCount ?? 0}</span>
            </button>
          )}
        </div>
      </div>
    </>
  )

  const className = "group flex flex-col gap-1.5 text-left"
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
