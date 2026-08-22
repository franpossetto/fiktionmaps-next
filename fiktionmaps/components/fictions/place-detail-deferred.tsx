import Image from "next/image"
import { getTranslations } from "next-intl/server"
import { Link } from "@/i18n/navigation"
import { imageFocusToObjectPosition } from "@/lib/asset-images/image-focus"
import { cn } from "@/lib/utils"
import { ScenePreviewThumb } from "@/components/scenes/scene-preview-thumb"
import { FictionDetailSectionHeading } from "@/components/fictions/fiction-detail-section-heading"
import { PlaceContributorsByline } from "@/components/fictions/place-contributors-byline"
import {
  publicFictionPlacePath,
  publicFictionScenePath,
} from "@/lib/fictions/public-fiction-paths"
import { getScenesForPlaceCached } from "@/src/scenes/infrastructure/next/scene.queries"
import { getPlaceContributorsWithDatesCached } from "@/src/contributions/infrastructure/next/contribution.queries"
import { getPlaceRelationshipsByPlaceIdCached } from "@/src/place-relationships/infrastructure/next/place-relationship.queries"
import type { PlaceRelationshipMemberPlace } from "@/src/place-relationships/domain/place-relationship.entity"

/** Async RSC: contributors off the place critical path. */
export async function PlaceDetailContributors({ placeId }: { placeId: string }) {
  const contributors = await getPlaceContributorsWithDatesCached(placeId)
  if (contributors.length === 0) return null
  return <PlaceContributorsByline contributors={contributors} className="max-w-full" />
}

export function PlaceDetailContributorsFallback() {
  return <div className="h-8 w-48 max-w-full animate-pulse rounded bg-muted/40" aria-hidden />
}

/** Round place thumb; falls back to the initial when the place has no photo yet. */
function RelatedPlaceThumb({
  image,
  imageFocus,
  name,
}: {
  image: string | null
  imageFocus: { x: number; y: number } | null
  name: string
}) {
  const src = image?.trim() ?? ""
  if (!src || src.endsWith("/placeholder.svg")) {
    return (
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold uppercase text-muted-foreground">
        {name.trim().charAt(0)}
      </span>
    )
  }
  return (
    <span className="relative h-6 w-6 shrink-0 overflow-hidden rounded-full bg-muted">
      <Image
        src={src}
        alt=""
        fill
        className="object-cover"
        style={{ objectPosition: imageFocusToObjectPosition(imageFocus) }}
        sizes="24px"
      />
    </span>
  )
}

function RelatedPlaceLink({
  member,
  label,
}: {
  member: PlaceRelationshipMemberPlace
  label: string
}) {
  return (
    <Link
      href={publicFictionPlacePath(member.fictionSlug, member.slug)}
      className="group inline-flex items-center gap-1.5 transition-colors hover:text-primary"
    >
      <RelatedPlaceThumb image={member.image} imageFocus={member.imageFocus} name={member.name} />
      <span className="font-medium text-foreground underline-offset-4 group-hover:text-primary group-hover:underline">
        {label}
      </span>
    </Link>
  )
}

/** Async RSC: approved place relationships as a compact line per relationship type. */
export async function PlaceDetailRelationships({ placeId }: { placeId: string }) {
  const t = await getTranslations("Fictions")
  const relationships = await getPlaceRelationshipsByPlaceIdCached(placeId)

  const byType = (type: "shared" | "composite") =>
    relationships
      .filter((relationship) => relationship.type === type)
      .flatMap((relationship) =>
        relationship.memberPlaces.filter((member) => member.placeId !== placeId),
      )

  const shared = byType("shared")
  const composite = byType("composite")
  if (shared.length === 0 && composite.length === 0) return null

  return (
    <div className="space-y-1.5 text-sm text-muted-foreground">
      {/* Shared: the other fiction is the point, so it stays visible. */}
      {shared.length > 0 ? (
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
          <span>{t("placeDetailRelatedShared")}</span>
          {shared.map((member) => (
            <RelatedPlaceLink key={member.placeId} member={member} label={member.fictionTitle} />
          ))}
        </p>
      ) : null}

      {/* Composite: same fiction, so only the sibling place name matters. */}
      {composite.length > 0 ? (
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
          <span>{t("placeDetailRelatedComposite", { count: composite.length })}</span>
          {composite.map((member) => (
            <RelatedPlaceLink key={member.placeId} member={member} label={member.name} />
          ))}
        </p>
      ) : null}
    </div>
  )
}

export function PlaceDetailRelationshipsFallback() {
  return (
    <div className="flex items-center gap-2" aria-hidden>
      <div className="h-4 w-24 animate-pulse rounded bg-muted/40" />
      <div className="h-6 w-6 shrink-0 animate-pulse rounded-full bg-muted/50" />
      <div className="h-4 w-40 max-w-full animate-pulse rounded bg-muted/40" />
    </div>
  )
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
