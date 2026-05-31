import { getTranslations } from "next-intl/server"
import Image from "next/image"
import { Link } from "@/i18n/navigation"
import type { ContributorModerationContext, FictionContributionFeedItem } from "@/src/contributions/domain/contribution.entity"
import type { FictionWithMediaAndCatalogIds } from "@/src/fictions/domain/fiction.entity"
import { FICTION_EXTERNAL_ID_PROVIDER } from "@/src/fiction-external-ids/domain/fiction-external-id.entity"
import { FICTION_LANGUAGE_LABELS, type FictionLanguageCode } from "@/lib/constants/fiction-languages"
import { DEFAULT_FICTION_COVER } from "@/lib/constants/placeholders"
import { StaffContributionReviewSection } from "@/components/contributions/staff-contribution-review-section"
import { contributionTypeMessageKey } from "@/components/contributions/contribution-type-label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

const IMDB_TITLE_URL_PREFIX = "https://www.imdb.com/title/"

function contributorLabel(c: FictionContributionFeedItem["contributor"]): string {
  if (c.fullName?.trim()) return c.fullName.trim()
  if (c.username?.trim()) return `@${c.username.trim()}`
  return c.id.slice(0, 8)
}

/** Single line: raw type slug · year · … (hero kicker). */
function workMetaDotsLine(fiction: FictionWithMediaAndCatalogIds): string {
  const parts = [
    fiction.type,
    String(fiction.year),
    fiction.author?.trim() || null,
    fiction.genre?.trim() || null,
  ].filter(Boolean) as string[]
  return parts.join(" · ")
}

function fictionTypeTranslationKey(
  type: FictionWithMediaAndCatalogIds["type"],
): "fictionType_movie" | "fictionType_book" | "fictionType_tv_series" {
  switch (type) {
    case "movie":
      return "fictionType_movie"
    case "book":
      return "fictionType_book"
    case "tv-series":
      return "fictionType_tv_series"
  }
}

/** Human-readable runtime from full-work seconds (movies / TV). */
function formatRuntimeSec(sec: number): string {
  if (!Number.isFinite(sec) || sec <= 0) return ""
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m} min`
}

export interface StaffContributionDetailProps {
  item: FictionContributionFeedItem
  fiction: FictionWithMediaAndCatalogIds | null
  contributorContext: ContributorModerationContext | null
}

/**
 * Columna central del layout de 3 columnas: material de revisión (hero, portada, sinopsis) + meta de obra + colaborador + revisión.
 * Metadatos de envío van en el carril derecho (`StaffContributionReviewRightAside`).
 */
export async function StaffContributionDetail({ item, fiction, contributorContext }: StaffContributionDetailProps) {
  const t = await getTranslations("Contributions")
  const coverFromFiction = fiction?.coverImageLarge ?? fiction?.coverImage
  const cover = coverFromFiction?.trim() || item.fictionCoverUrl?.trim() || null
  const coverSrc = cover || DEFAULT_FICTION_COVER
  const heroFromFiction =
    fiction?.bannerImage?.trim() || fiction?.coverImageLarge?.trim() || fiction?.coverImage?.trim() || null
  const heroSrc = heroFromFiction || coverSrc
  const workTitle =
    fiction?.title?.trim() || item.fictionTitle?.trim() || t("feedCard_untitledFiction")

  const coverFrameClass =
    "relative shrink-0 overflow-hidden rounded-xl border border-border bg-muted h-[7.5rem] w-20 sm:h-36 sm:w-24"

  const imdbId = fiction?.catalogExternalIds?.[FICTION_EXTERNAL_ID_PROVIDER.IMDB]?.trim() || null

  const otherExternalEntries =
    fiction?.catalogExternalIds != null
      ? Object.entries(fiction.catalogExternalIds).filter(
          ([provider, id]) =>
            provider !== FICTION_EXTERNAL_ID_PROVIDER.IMDB && typeof id === "string" && id.trim().length > 0,
        )
      : []

  return (
    <div className="flex flex-col">
      <section className="border-b border-border/60 pb-8 sm:pb-10">
        <div className="relative aspect-[21/9] w-full overflow-hidden rounded-xl border border-border/60">
          <Image
            src={heroSrc}
            alt={workTitle}
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 920px"
          />
        </div>
        <div className="mt-8 flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
          <div className={`${coverFrameClass} mx-auto sm:mx-0`}>
            <Image src={coverSrc} alt={workTitle} fill className="object-contain object-center" sizes="96px" />
          </div>
          <div className="min-w-0 flex-1">
            {fiction ? (
              <p className="text-sm text-muted-foreground sm:text-base">{workMetaDotsLine(fiction)}</p>
            ) : null}
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{workTitle}</h1>
            <p className="mt-3 max-w-2xl whitespace-pre-wrap text-sm leading-relaxed text-foreground/90 sm:text-base">
              {fiction?.description?.trim()
                ? fiction.description.trim()
                : fiction
                  ? t("detailReviewNoDescription")
                  : t("fictionUnavailable")}
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
        </div>
      </section>

      <section className="border-b border-border/60 py-6">
        <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-foreground">{t("sectionFictionDetails")}</h2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">{t("sectionFictionDetailsHelp")}</p>
        <dl className="mt-3 divide-y divide-border/50 rounded-lg border border-border/60 bg-muted/15">
          {fiction ? (
            <>
              <div className="flex flex-col gap-0.5 px-3 py-2 sm:flex-row sm:items-start sm:gap-4">
                <dt className="shrink-0 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground sm:w-36">
                  {t("fieldCatalogTitle")}
                </dt>
                <dd className="min-w-0 text-sm font-medium leading-snug text-foreground sm:flex-1">{fiction.title.trim()}</dd>
              </div>
              <div className="flex flex-col gap-0.5 px-3 py-2 sm:flex-row sm:items-baseline sm:gap-4">
                <dt className="shrink-0 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground sm:w-36">
                  {t("fieldCatalogWorkType")}
                </dt>
                <dd className="text-sm text-foreground sm:flex-1">{t(fictionTypeTranslationKey(fiction.type))}</dd>
              </div>
              <div className="flex flex-col gap-0.5 px-3 py-2 sm:flex-row sm:items-baseline sm:gap-4">
                <dt className="shrink-0 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground sm:w-36">{t("fieldCatalogYear")}</dt>
                <dd className="tabular-nums text-sm text-foreground sm:flex-1">{fiction.year}</dd>
              </div>
              <div className="flex flex-col gap-0.5 px-3 py-2 sm:flex-row sm:items-baseline sm:gap-4">
                <dt className="shrink-0 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground sm:w-36">{t("fieldCatalogGenre")}</dt>
                <dd className="text-sm text-foreground sm:flex-1">{fiction.genre?.trim() ? fiction.genre.trim() : "—"}</dd>
              </div>
              <div className="flex flex-col gap-0.5 px-3 py-2 sm:flex-row sm:items-start sm:gap-4">
                <dt className="shrink-0 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground sm:w-36">
                  {t("fieldCatalogAuthorDirector")}
                </dt>
                <dd className="min-w-0 text-sm leading-snug text-foreground sm:flex-1">{fiction.author?.trim() ? fiction.author.trim() : "—"}</dd>
              </div>
              {imdbId ? (
                <div className="flex flex-col gap-0.5 px-3 py-2 sm:flex-row sm:items-baseline sm:gap-4">
                  <dt className="shrink-0 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground sm:w-36">{t("fieldImdbId")}</dt>
                  <dd className="min-w-0 sm:flex-1">
                    <a
                      href={`${IMDB_TITLE_URL_PREFIX}${encodeURIComponent(imdbId)}/`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="break-all font-mono text-sm font-medium text-primary underline-offset-2 hover:underline"
                    >
                      {imdbId}
                    </a>
                  </dd>
                </div>
              ) : null}
              {otherExternalEntries.map(([provider, id]) => (
                <div key={provider} className="flex flex-col gap-0.5 px-3 py-2 sm:flex-row sm:items-baseline sm:gap-4">
                  <dt className="shrink-0 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground sm:w-36">
                    {t("fieldExternalIdProvider", { provider })}
                  </dt>
                  <dd className="break-all font-mono text-sm text-foreground sm:flex-1">{(id ?? "").trim()}</dd>
                </div>
              ))}
              {fiction.slug?.trim() ? (
                <div className="flex flex-col gap-0.5 px-3 py-2 sm:flex-row sm:items-baseline sm:gap-4">
                  <dt className="shrink-0 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground sm:w-36">{t("fieldCatalogSlug")}</dt>
                  <dd className="break-all font-mono text-sm text-foreground sm:flex-1">{fiction.slug.trim()}</dd>
                </div>
              ) : null}
              {fiction.type !== "book" && fiction.duration_sec != null && formatRuntimeSec(fiction.duration_sec) ? (
                <div className="flex flex-col gap-0.5 px-3 py-2 sm:flex-row sm:items-baseline sm:gap-4">
                  <dt className="shrink-0 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground sm:w-36">{t("fieldCatalogRuntime")}</dt>
                  <dd className="tabular-nums text-sm text-foreground sm:flex-1">{formatRuntimeSec(fiction.duration_sec)}</dd>
                </div>
              ) : null}
              {fiction.original_language ? (
                <div className="flex flex-col gap-0.5 px-3 py-2 sm:flex-row sm:items-baseline sm:gap-4">
                  <dt className="shrink-0 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground sm:w-36">
                    {t("fieldOriginalLanguage")}
                  </dt>
                  <dd className="text-sm text-foreground sm:flex-1">
                    {FICTION_LANGUAGE_LABELS[fiction.original_language as FictionLanguageCode] ?? fiction.original_language}
                  </dd>
                </div>
              ) : null}
              {fiction.content_language ? (
                <div className="flex flex-col gap-0.5 px-3 py-2 sm:flex-row sm:items-baseline sm:gap-4">
                  <dt className="shrink-0 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground sm:w-36">
                    {t("fieldContentLanguage")}
                  </dt>
                  <dd className="text-sm text-foreground sm:flex-1">
                    {FICTION_LANGUAGE_LABELS[fiction.content_language as FictionLanguageCode] ?? fiction.content_language}
                  </dd>
                </div>
              ) : null}
            </>
          ) : (
            <div className="px-3 py-3">
              <dt className="sr-only">{t("fictionUnavailable")}</dt>
              <dd className="text-sm text-muted-foreground">{t("fictionUnavailable")}</dd>
            </div>
          )}
        </dl>
      </section>

      <section className="py-10">
        <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-foreground">{t("sectionContributor")}</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{t("sectionContributorHelp")}</p>
        <div className="mt-6 flex items-center gap-4">
          <Avatar className="h-12 w-12 border border-border/60">
            {item.contributor.avatarUrl ? <AvatarImage src={item.contributor.avatarUrl} alt="" /> : null}
            <AvatarFallback className="font-semibold">{contributorLabel(item.contributor).charAt(0)}</AvatarFallback>
          </Avatar>
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
            href={`/contributions?submitter=${encodeURIComponent(item.userId)}`}
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
