"use client"

import { useTranslations } from "next-intl"
import { Badge } from "@/components/ui/badge"
import { PageBreadcrumb } from "@/components/navigation/page-breadcrumb"
import { SceneWatchPlacesSection } from "@/components/scenes/scene-watch-places-section"
import type { Scene } from "@/src/scenes/domain/scene.entity"
import type { Fiction } from "@/src/fictions/domain/fiction.entity"
import type { Place } from "@/src/places/domain/place.entity"

export function SceneWatchView({
  currentWatchScene,
  fiction,
  fictionPathSlug,
  isTvSeries,
  placeName,
  placeSlug,
  places = [],
  useShellMainScroll = false,
}: {
  currentWatchScene: Scene
  fiction?: Fiction
  fictionPathSlug?: string
  isTvSeries: boolean
  placeName?: string
  placeSlug?: string
  places?: Place[]
  useShellMainScroll?: boolean
}) {
  const tMeta = useTranslations("Metadata")
  const t = useTranslations("Fictions")

  const fictionTypeLabel =
    fiction?.type === "tv-series"
      ? t("typeTvSeries")
      : fiction?.type === "book"
        ? t("typeBook")
        : fiction
          ? t("typeMovie")
          : null

  return (
    <div
      className={
        useShellMainScroll ? "min-h-0 h-full bg-background" : "h-full overflow-y-auto bg-background"
      }
    >
      <div className="mx-auto w-full max-w-[1500px] px-6 py-6 sm:px-8 lg:px-10">
        <article className="space-y-10">
          <header className="space-y-5">
            {fiction && (
              <PageBreadcrumb
                ariaLabel={tMeta("breadcrumbNavAriaLabel")}
                items={[
                  { label: tMeta("breadcrumbFictions"), href: "/fictions" },
                  {
                    label: fiction.title,
                    href: fictionPathSlug ? `/fictions/${fictionPathSlug}` : undefined,
                  },
                  ...(placeName
                    ? [{
                        label: placeName,
                        href:
                          fictionPathSlug && placeSlug
                            ? `/fictions/${fictionPathSlug}/places/${placeSlug}`
                            : undefined,
                      }]
                    : []),
                  { label: currentWatchScene.title },
                ]}
              />
            )}

            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {fictionTypeLabel ? (
                <Badge variant="secondary" className="text-xs">
                  {fictionTypeLabel}
                </Badge>
              ) : null}
              {fiction ? <span>{fiction.title}</span> : null}
              {currentWatchScene.timestamp ? (
                <span>{currentWatchScene.timestamp}</span>
              ) : null}
              {isTvSeries && currentWatchScene.season && currentWatchScene.episode ? (
                <span>
                  S{currentWatchScene.season} E{currentWatchScene.episode}
                </span>
              ) : null}
            </div>

            <h1 className="w-full text-balance text-3xl font-bold leading-[1.15] tracking-tight text-foreground sm:text-4xl xl:text-[2.65rem]">
              {currentWatchScene.title}
            </h1>

            <div className="overflow-hidden rounded-xl border border-border/60 bg-black">
              <video
                key={currentWatchScene.id}
                src={currentWatchScene.videoUrl || undefined}
                poster={currentWatchScene.thumbnail || undefined}
                autoPlay
                controls
                muted
                playsInline
                className="aspect-video w-full"
              />
            </div>

            {currentWatchScene.description ? (
              <p className="max-w-[75ch] text-base leading-8 text-muted-foreground">
                {currentWatchScene.description}
              </p>
            ) : null}
            {currentWatchScene.quote ? (
              <blockquote className="max-w-[75ch] border-l-2 border-primary/40 pl-3 text-sm italic leading-relaxed text-foreground/80">
                {`"${currentWatchScene.quote}"`}
              </blockquote>
            ) : null}
          </header>

          {fiction && fictionPathSlug && places.length > 0 ? (
            <SceneWatchPlacesSection
              fictionId={fiction.id}
              fictionPathSlug={fictionPathSlug}
              places={places}
            />
          ) : null}
        </article>
      </div>
    </div>
  )
}
