import { getTranslations } from "next-intl/server"
import { Link } from "@/i18n/navigation"
import { cn } from "@/lib/utils"
import { ScenePreviewThumb } from "@/components/scenes/scene-preview-thumb"
import { FictionDetailSectionHeading } from "@/components/fictions/fiction-detail-section-heading"
import { PlaceContributorsByline } from "@/components/fictions/place-contributors-byline"
import { publicFictionScenePath } from "@/lib/fictions/public-fiction-paths"
import { getScenesForPlaceCached } from "@/src/scenes/infrastructure/next/scene.queries"
import { getPlaceContributorsWithDatesCached } from "@/src/contributions/infrastructure/next/contribution.queries"

/** Async RSC: contributors off the place critical path. */
export async function PlaceDetailContributors({ placeId }: { placeId: string }) {
  const contributors = await getPlaceContributorsWithDatesCached(placeId)
  if (contributors.length === 0) return null
  return <PlaceContributorsByline contributors={contributors} className="max-w-full" />
}

export function PlaceDetailContributorsFallback() {
  return <div className="h-8 w-48 max-w-full animate-pulse rounded bg-muted/40" aria-hidden />
}

/** Async RSC: scenes list off the place critical path. */
export async function PlaceDetailScenes({
  placeId,
  fictionPathSlug,
}: {
  placeId: string
  fictionPathSlug: string
}) {
  const t = await getTranslations("Fictions")
  const scenes = await getScenesForPlaceCached(placeId)

  return (
    <section className="space-y-5">
      <FictionDetailSectionHeading
        title={t("placeDetailScenesHeading")}
        count={scenes.length}
      />

      {scenes.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("placeDetailNoScenes")}</p>
      ) : (
        <ol className="divide-y divide-border/60 rounded-xl border border-border/40 bg-card/30">
          {scenes.map((scene, index) => {
            const timeLabel = scene.timestamp?.trim() || ""
            return (
              <li key={scene.id} className="px-4 py-4 sm:px-5 sm:py-5">
                <Link
                  href={publicFictionScenePath(fictionPathSlug, scene.id)}
                  className="flex min-w-0 flex-1 cursor-pointer items-center gap-4 rounded-lg outline-none ring-offset-background transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <p className="w-6 shrink-0 text-center text-sm font-semibold tabular-nums text-muted-foreground">
                    {index + 1}
                  </p>
                  <ScenePreviewThumb scene={scene} className="h-16 w-20 sm:h-18 sm:w-24" sizes="96px" />
                  <div className="min-w-0 flex-1">
                    {timeLabel ? (
                      <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                        {timeLabel}
                      </p>
                    ) : null}
                    <p
                      className={cn(
                        "text-base font-semibold leading-snug text-foreground sm:text-lg",
                        timeLabel ? "mt-1" : "",
                      )}
                    >
                      {scene.title}
                    </p>
                    {scene.description ? (
                      <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{scene.description}</p>
                    ) : null}
                  </div>
                </Link>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}

export function PlaceDetailScenesFallback() {
  return (
    <section className="space-y-5" aria-hidden>
      <div className="h-8 w-56 animate-pulse rounded bg-muted/50" />
      <div className="space-y-0 divide-y divide-border/60 rounded-xl border border-border/40">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-4 sm:px-5 sm:py-5">
            <div className="h-16 w-20 shrink-0 animate-pulse rounded-md bg-muted/40 sm:h-18 sm:w-24" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-3 w-16 animate-pulse rounded bg-muted/40" />
              <div className="h-5 w-2/3 animate-pulse rounded bg-muted/50" />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
