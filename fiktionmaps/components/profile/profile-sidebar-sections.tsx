"use client"

import type { ReactNode } from "react"
import { ArrowRight } from "lucide-react"
import Image from "next/image"
import { useTranslations } from "next-intl"
import { useRouter } from "@/i18n/navigation"
import type { City } from "@/src/cities/domain/city.entity"
import type { EnrichedPlaceCheckin } from "@/src/checkins/domain/checkin.entity"
import { DEFAULT_FICTION_COVER } from "@/lib/constants/placeholders"
import type { ProfileArticlePreview, ProfileScenePreview } from "@/src/scenes/infrastructure/next/profile-scene-previews.actions"

/** Profile section headers show "See all" only when total records exceed this count. */
export const PROFILE_SEE_ALL_THRESHOLD = 10

// ─── Rows (mismo layout visual que Latest missions: thumb + título + subtítulo) ─

/** Imagen cuadrada — Places, Scenes, Home. */
export function PlacesSidebarRow({
  leading,
  title,
  subtitle,
}: {
  leading: ReactNode
  title: string
  subtitle?: string | null
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-3">
      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-border/50 bg-muted">
        {leading}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{title}</p>
        {subtitle ? (
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
    </div>
  )
}

/** Misma piel que Places; datos distintos en el caller. */
export function ScenesSidebarRow({
  leading,
  title,
  subtitle,
}: {
  leading: ReactNode
  title: string
  subtitle?: string | null
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-3">
      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-border/50 bg-muted">
        {leading}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{title}</p>
        {subtitle ? (
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
    </div>
  )
}

/** Cover de película — thumb un poco más vertical (ratio ~2:3). */
export function ArticlesSidebarRow({
  leading,
  title,
  subtitle,
}: {
  leading: ReactNode
  title: string
  subtitle?: string | null
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-3">
      <div className="relative h-12 w-8 shrink-0 overflow-hidden rounded-lg border border-border/50 bg-muted">
        {leading}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{title}</p>
        {subtitle ? (
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
    </div>
  )
}

// ─── Places ─────────────────────────────────────────────────────────────────

interface PlacesSectionProps {
  checkins: EnrichedPlaceCheckin[]
  cityMap: Map<string, City>
}

export function PlacesSection({ checkins, cityMap }: PlacesSectionProps) {
  const t = useTranslations("Profile")
  const router = useRouter()
  const seen = new Set<string>()
  const uniquePlaces = checkins.filter((c) => {
    if (seen.has(c.placeId)) return false
    seen.add(c.placeId)
    return true
  })
  const showSeeAll = uniquePlaces.length > PROFILE_SEE_ALL_THRESHOLD
  const unique = uniquePlaces.slice(0, 5)

  const visible =
    unique.length > 0
      ? unique.map((c) => ({
          key: c.id,
          fictionId: c.fictionId,
          placeId: c.placeId,
          imageUrl:
            c.placeImage?.trim() ||
            c.fictionCover?.trim() ||
            DEFAULT_FICTION_COVER,
          fictionTitle: c.fictionTitle || t("unknownFiction"),
          cityName:
            c.cityName ??
            (c.cityId ? cityMap.get(c.cityId)?.name : null) ??
            t("unknownCity"),
        }))
      : []

  return (
    <SidebarCard
      title={t("sidebarPlaces")}
      ctaLabel={showSeeAll ? t("seeAll") : undefined}
      emptyMessage={t("noSidebarPlaces")}
    >
      {visible.map((row) => (
        <button
          key={row.key}
          type="button"
          onClick={() =>
            router.push(
              `/fiction/${encodeURIComponent(row.fictionId)}/place/${encodeURIComponent(row.placeId)}`,
            )
          }
          className="block w-full text-left transition-colors hover:bg-muted/30"
        >
          <PlacesSidebarRow
            title={row.fictionTitle}
            subtitle={row.cityName}
            leading={
              <Image
                src={row.imageUrl}
                alt=""
                fill
                sizes="40px"
                className="object-cover"
              />
            }
          />
        </button>
      ))}
    </SidebarCard>
  )
}

// ─── Scenes ────────────────────────────────────────────────────────────────

export function ScenesSection({ rows: previewRows }: { rows: ProfileScenePreview[] }) {
  const t = useTranslations("Profile")
  const router = useRouter()
  const showSeeAll = previewRows.length > PROFILE_SEE_ALL_THRESHOLD

  const rows = previewRows.map((d) => ({
    key: d.id,
    fictionId: d.fictionId,
    imageUrl: d.imageUrl?.trim() || DEFAULT_FICTION_COVER,
    title: d.title,
    subtitle: d.fictionTitle,
  }))

  return (
    <SidebarCard
      title={t("sidebarScenes")}
      ctaLabel={showSeeAll ? t("seeAll") : undefined}
      emptyMessage={t("noSidebarScenes")}
    >
      {rows.map((row) => (
        <button
          key={row.key}
          type="button"
          onClick={() =>
            router.push(
              `/fiction/${encodeURIComponent(row.fictionId)}/scene/${encodeURIComponent(row.key)}`,
            )
          }
          className="block w-full text-left transition-colors hover:bg-muted/30"
        >
          <ScenesSidebarRow
            title={row.title}
            subtitle={row.subtitle}
            leading={
              <Image
                src={row.imageUrl}
                alt=""
                fill
                sizes="40px"
                className="object-cover"
              />
            }
          />
        </button>
      ))}
    </SidebarCard>
  )
}

// ─── Articles ────────────────────────────────────────────────────────────────

export function ArticlesSection({ rows: previewRows }: { rows: ProfileArticlePreview[] }) {
  const t = useTranslations("Profile")
  const showSeeAll = previewRows.length > PROFILE_SEE_ALL_THRESHOLD

  const rows = previewRows.map((d) => ({
    key: d.id,
    imageUrl: d.imageUrl?.trim() || DEFAULT_FICTION_COVER,
    title: d.title,
    subtitle: d.subtitle?.trim() || undefined,
  }))

  return (
    <SidebarCard
      title={t("sidebarArticles")}
      ctaLabel={showSeeAll ? t("seeAll") : undefined}
      emptyMessage={t("noSidebarArticles")}
    >
      {rows.map((row) => (
        <ArticlesSidebarRow
          key={row.key}
          title={row.title}
          subtitle={row.subtitle}
          leading={
            <Image
              src={row.imageUrl}
              alt=""
              fill
              sizes="32px"
              className="object-cover"
            />
          }
        />
      ))}
    </SidebarCard>
  )
}

// ─── Card shell (misma piel que Latest missions: título xs + lista con borde muted) ─

interface SidebarCardProps {
  title: string
  ctaLabel?: string
  emptyMessage?: string
  children?: ReactNode
}

export function SidebarCard({ title, ctaLabel, emptyMessage, children }: SidebarCardProps) {
  const hasChildren =
    !!children &&
    (Array.isArray(children)
      ? (children as ReactNode[]).filter(Boolean).length > 0
      : true)

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {title}
        </h3>
        {ctaLabel && (
          <button
            type="button"
            className="flex shrink-0 items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            {ctaLabel}
            <ArrowRight className="h-3 w-3" />
          </button>
        )}
      </div>

      {!hasChildren ? (
        emptyMessage ? (
          <p className="rounded-xl border border-border/60 bg-muted/15 px-3 py-3 text-sm text-muted-foreground">
            {emptyMessage}
          </p>
        ) : null
      ) : (
        <div className="divide-y divide-border/50 rounded-xl border border-border/60 bg-muted/15">
          {children}
        </div>
      )}
    </section>
  )
}

/** Misma cáscara que SidebarCard, para estados de carga async. */
export function SidebarSectionLoading({ title, message }: { title: string; message: string }) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{title}</h3>
      </div>
      <p className="rounded-xl border border-border/60 bg-muted/15 px-3 py-3 text-sm text-muted-foreground animate-pulse">
        {message}
      </p>
    </section>
  )
}
