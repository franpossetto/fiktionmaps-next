import { getTranslations } from "next-intl/server"
import { Clapperboard } from "lucide-react"
import { Link } from "@/i18n/navigation"
import Image from "next/image"
import type {
  ContributorModerationContext,
  SceneContributionFeedItem,
} from "@/src/contributions/domain/contribution.entity"
import { isAddPlaceToSceneContribution } from "@/src/contributions/domain/contribution.entity"
import type { Scene } from "@/src/scenes/domain/scene.entity"
import { contributionTypeMessageKey } from "@/components/contributions/contribution-type-label"
import { StaffContributionReviewSection } from "@/components/contributions/staff-contribution-review-section"
import { UserAvatar } from "@/components/ui/user-avatar"
import { DEFAULT_FICTION_COVER } from "@/lib/constants/placeholders"

function contributorLabel(c: SceneContributionFeedItem["contributor"]): string {
  if (c.fullName?.trim()) return c.fullName.trim()
  if (c.username?.trim()) return `@${c.username.trim()}`
  return c.id.slice(0, 8)
}

export interface StaffSceneContributionDetailProps {
  item: SceneContributionFeedItem
  /** Fresh cookie-client read: pending/staff-only rows are visible here (D2). */
  scene: Scene | null
  contributorContext: ContributorModerationContext | null
}

/** Read-only per D2: no edit affordance, no link to `/admin/scene/[id]`. Approve/reject only. */
export async function StaffSceneContributionDetail({
  item,
  scene,
  contributorContext,
}: StaffSceneContributionDetailProps) {
  const t = await getTranslations("Contributions")
  const sceneTitle = scene?.title?.trim() || item.sceneTitle?.trim() || t("feedCard_untitledScene")
  const videoUrl = scene?.videoUrl?.trim() || item.sceneVideoUrl?.trim() || null
  const fictionTitle = item.fictionTitle?.trim() || "—"
  const description = scene?.description?.trim() || null
  const quote = scene?.quote?.trim() || null
  const timestamp = scene?.timestamp?.trim() || null
  const season = scene?.season ?? null
  const episode = scene?.episode ?? null
  const episodeTitle = scene?.episodeTitle?.trim() || null
  const placeNames = item.placeNames
  const isAddPlace = isAddPlaceToSceneContribution(item)
  const proposedPlaces = item.proposedPlaces

  return (
    <div className="flex flex-col">
      <section className="border-b border-border/60 pb-8 sm:pb-10">
        <div className="relative mx-auto aspect-video w-full max-w-2xl overflow-hidden rounded-xl border border-border bg-muted">
          {videoUrl ? (
            <video src={videoUrl} controls preload="metadata" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <Clapperboard className="h-10 w-10 opacity-60" aria-hidden />
            </div>
          )}
        </div>
        <div className="mt-6">
          <p className="text-sm text-muted-foreground">{fictionTitle}</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{sceneTitle}</h1>
          <p className="mt-3 max-w-2xl whitespace-pre-wrap text-sm leading-relaxed text-foreground/90 sm:text-base">
            {description ? description : scene ? t("detailReviewNoDescription") : t("sceneUnavailable")}
          </p>
          <div className="mt-4 space-y-2">
            <p className="text-xs text-muted-foreground">
              {t("fieldType")}{" "}
              <span className="font-medium text-foreground">{t(contributionTypeMessageKey(item.type))}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              {t("detail_contributionIdLabel")}{" "}
              <code className="rounded-md bg-muted/80 px-1.5 py-0.5 font-mono text-foreground">{item.id}</code>
            </p>
          </div>
        </div>
      </section>

      {isAddPlace ? (
        <section className="border-b border-border/60 py-6">
          <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-foreground">
            {t("sectionProposedPlace")}
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
            {t("sectionProposedPlaceHelp")}
          </p>
          <ul className="mt-4 space-y-2">
            {proposedPlaces.length === 0 ? (
              <li className="rounded-lg border border-border/60 bg-muted/15 px-3 py-3 text-sm text-muted-foreground">
                —
              </li>
            ) : (
              proposedPlaces.map((place, index) => (
                <li
                  key={place.placeId}
                  className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/15 px-3 py-3"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-semibold text-background">
                    {index + 1}
                  </span>
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
                    <Image
                      src={place.avatarUrl?.trim() || DEFAULT_FICTION_COVER}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="48px"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                      {t("fieldProposedPlace")}
                    </p>
                    <p className="mt-0.5 truncate text-sm font-medium text-foreground">
                      {place.name?.trim() || "—"}
                    </p>
                  </div>
                </li>
              ))
            )}
          </ul>
        </section>
      ) : null}

      <section className="border-b border-border/60 py-6">
        <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-foreground">{t("sectionSceneDetails")}</h2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">{t("sectionSceneDetailsHelp")}</p>
        <dl className="mt-3 divide-y divide-border/50 rounded-lg border border-border/60 bg-muted/15">
          {scene ? (
            <>
              <div className="flex flex-col gap-0.5 px-3 py-2 sm:flex-row sm:items-baseline sm:gap-4">
                <dt className="shrink-0 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground sm:w-36">
                  {t("fieldParentFiction")}
                </dt>
                <dd className="text-sm text-foreground sm:flex-1">{fictionTitle}</dd>
              </div>
              <div className="flex flex-col gap-0.5 px-3 py-2 sm:flex-row sm:items-start sm:gap-4">
                <dt className="shrink-0 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground sm:w-36">
                  {t("fieldLinkedPlaces")}
                </dt>
                <dd className="min-w-0 text-sm leading-snug text-foreground sm:flex-1">
                  {placeNames.length > 0 ? placeNames.join(", ") : "—"}
                </dd>
              </div>
              {timestamp ? (
                <div className="flex flex-col gap-0.5 px-3 py-2 sm:flex-row sm:items-baseline sm:gap-4">
                  <dt className="shrink-0 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground sm:w-36">
                    {t("fieldSceneTimecode")}
                  </dt>
                  <dd className="text-sm text-foreground sm:flex-1">{timestamp}</dd>
                </div>
              ) : null}
              {season != null ? (
                <div className="flex flex-col gap-0.5 px-3 py-2 sm:flex-row sm:items-baseline sm:gap-4">
                  <dt className="shrink-0 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground sm:w-36">
                    {t("fieldSceneSeason")}
                  </dt>
                  <dd className="tabular-nums text-sm text-foreground sm:flex-1">{season}</dd>
                </div>
              ) : null}
              {episode != null ? (
                <div className="flex flex-col gap-0.5 px-3 py-2 sm:flex-row sm:items-baseline sm:gap-4">
                  <dt className="shrink-0 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground sm:w-36">
                    {t("fieldSceneEpisode")}
                  </dt>
                  <dd className="tabular-nums text-sm text-foreground sm:flex-1">{episode}</dd>
                </div>
              ) : null}
              {episodeTitle ? (
                <div className="flex flex-col gap-0.5 px-3 py-2 sm:flex-row sm:items-baseline sm:gap-4">
                  <dt className="shrink-0 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground sm:w-36">
                    {t("fieldSceneEpisodeTitle")}
                  </dt>
                  <dd className="text-sm text-foreground sm:flex-1">{episodeTitle}</dd>
                </div>
              ) : null}
              {quote ? (
                <div className="flex flex-col gap-0.5 px-3 py-2 sm:flex-row sm:items-start sm:gap-4">
                  <dt className="shrink-0 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground sm:w-36">
                    {t("fieldSceneQuote")}
                  </dt>
                  <dd className="min-w-0 text-sm italic leading-snug text-foreground sm:flex-1">“{quote}”</dd>
                </div>
              ) : null}
            </>
          ) : (
            <div className="px-3 py-3">
              <dd className="text-sm text-muted-foreground">{t("sceneUnavailable")}</dd>
            </div>
          )}
        </dl>
      </section>

      <section className="py-10">
        <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-foreground">{t("sectionContributor")}</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{t("sectionContributorHelp")}</p>
        <div className="mt-6 flex items-center gap-4">
          <UserAvatar
            avatarId={item.contributor.avatarUrl}
            fallback={contributorLabel(item.contributor).charAt(0)}
            className="h-12 w-12 border border-border/60 font-semibold"
          />
          <div>
            <p className="font-semibold text-foreground">{contributorLabel(item.contributor)}</p>
            {item.contributor.username ? (
              <p className="text-sm text-muted-foreground">@{item.contributor.username}</p>
            ) : null}
          </div>
        </div>
        {contributorContext ? (
          <div className="mt-4 max-w-2xl space-y-2 text-sm text-muted-foreground">
            {contributorContext.otherContributionsCount === 0 ? (
              <p>{t("contributorStatsOthersNone")}</p>
            ) : (
              <p>{t("contributorStatsOthersMany", { count: contributorContext.otherContributionsCount })}</p>
            )}
            <p className="tabular-nums">{t("contributorStatsFpp", { points: contributorContext.fppTotal })}</p>
          </div>
        ) : null}
        <p className="mt-4">
          <Link
            href={`/contributions?submitter=${encodeURIComponent(item.userId)}&kind=scene`}
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            {t("contributorOpenContributionsQueue")}
          </Link>
        </p>
      </section>

      <StaffContributionReviewSection status={item.status} contributionId={item.id} contributionType={item.type} />
    </div>
  )
}
