"use client"

import Image from "next/image"
import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { DEFAULT_FICTION_COVER } from "@/lib/constants/placeholders"
import { useRecentFictionsStorage } from "@/lib/local-storage-service-hooks"
import type { FictionWithMedia } from "@/src/fictions/domain/fiction.entity"

const RECENT_SIDEBAR_DISPLAY_LIMIT = 4

interface RecentFictionsSidebarProps {
  initialFictions: FictionWithMedia[]
}

export function RecentFictionsSidebar({ initialFictions }: RecentFictionsSidebarProps) {
  const t = useTranslations("Fictions")
  const { items } = useRecentFictionsStorage()

  const fictionById = new Map(initialFictions.map((f) => [f.id, f]))

  const recentFictions = items
    .map((item) => fictionById.get(item.id))
    .filter((f): f is FictionWithMedia => f !== undefined && f.active)
    .slice(0, RECENT_SIDEBAR_DISPLAY_LIMIT)

  if (recentFictions.length === 0) return null

  return (
    <section className="space-y-1.5">
      <h3 className="text-base font-bold tracking-tight text-foreground">{t("latestVisited")}</h3>
      <ul className="space-y-1">
        {recentFictions.map((fiction) => (
          <li key={fiction.id}>
            <Link
              href={`/fictions/${fiction.slug}`}
              className="flex items-start gap-1.5 rounded-md px-1 py-1 text-sm leading-snug text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
            >
              <div className="relative mt-0.5 h-7 w-7 shrink-0 overflow-hidden rounded-full border border-border/60 bg-muted/30">
                <Image
                  src={
                    fiction.coverImage?.trim() ||
                    fiction.coverImageLarge?.trim() ||
                    DEFAULT_FICTION_COVER
                  }
                  alt={fiction.title}
                  fill
                  className="object-cover"
                  sizes="28px"
                />
              </div>
              <div className="min-w-0">
                <p className="line-clamp-2 text-[13px] font-medium text-foreground">
                  {fiction.title}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {fiction.year ? `${fiction.year} · ` : ""}
                  {fiction.genre}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
