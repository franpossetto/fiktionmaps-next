"use client"

import { useState } from "react"
import Image from "next/image"
import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { DEFAULT_FICTION_COVER } from "@/lib/constants/placeholders"
import type { FictionWithMedia } from "@/src/fictions/domain/fiction.entity"

type ProfileLikedFictionsProps = {
  fictions: FictionWithMedia[]
}

export function ProfileLikedFictions({ fictions }: ProfileLikedFictionsProps) {
  const t = useTranslations("Profile")

  if (fictions.length === 0) return null

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {t("likedFictionsHeading")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("likedFictionsSubtitle")}</p>
      </div>

      <ul className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1 [scrollbar-width:thin]">
        {fictions.map((fiction) => (
          <li key={fiction.id} className="w-[104px] shrink-0 sm:w-[116px]">
            <LikedFictionChip fiction={fiction} />
          </li>
        ))}
      </ul>
    </section>
  )
}

function LikedFictionChip({ fiction }: { fiction: FictionWithMedia }) {
  const [coverError, setCoverError] = useState(false)
  const coverSrc =
    fiction.coverImageThumb?.trim() ||
    fiction.coverImage?.trim() ||
    DEFAULT_FICTION_COVER
  const showPlaceholder =
    coverError || !(fiction.coverImageThumb?.trim() || fiction.coverImage?.trim())

  return (
    <Link href={`/fictions/${fiction.slug}`} className="group block w-full">
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-lg border border-border/50 bg-muted">
        <Image
          src={showPlaceholder ? DEFAULT_FICTION_COVER : coverSrc}
          alt={fiction.title}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          style={{
            objectPosition: `${fiction.coverFocus?.x ?? 50}% ${fiction.coverFocus?.y ?? 50}%`,
          }}
          sizes="116px"
          onError={() => setCoverError(true)}
        />
      </div>
      <p className="mt-1.5 line-clamp-2 text-[11px] font-medium leading-snug text-foreground group-hover:text-primary">
        {fiction.title}
      </p>
    </Link>
  )
}
