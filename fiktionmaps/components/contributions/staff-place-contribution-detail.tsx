import { getTranslations } from "next-intl/server"
import Image from "next/image"
import { Link } from "@/i18n/navigation"
import {
  getPendingPathsForRole,
  isLinkPlaceRelationshipContribution,
  isPlaceAddPhotoContribution,
  type ContributorModerationContext,
  type PlaceContributionFeedItem,
} from "@/src/contributions/domain/contribution.entity"
import { publicAssetImageUrl } from "@/lib/asset-images/public-asset-url"
import { getPlacePhotoContributeContextAction } from "@/src/places/infrastructure/next/place.actions"
import type { FictionWithMedia } from "@/src/fictions/domain/fiction.entity"
import type { Place } from "@/src/places/domain/place.entity"
import { contributionTypeMessageKey } from "@/components/contributions/contribution-type-label"
import { StaffContributionReviewSection } from "@/components/contributions/staff-contribution-review-section"
import { StreetViewReferencePreview } from "@/components/places/street-view-reference-preview"
import { DEFAULT_FICTION_COVER } from "@/lib/constants/placeholders"
import { UserAvatar } from "@/components/ui/user-avatar"
import { PlaceShootEnvironmentBadge } from "@/components/places/place-shoot-environment-badge"

function contributorLabel(c: PlaceContributionFeedItem["contributor"]): string {
  if (c.fullName?.trim()) return c.fullName.trim()
  if (c.username?.trim()) return `@${c.username.trim()}`
  return c.id.slice(0, 8)
}

export interface StaffPlaceContributionDetailProps {
  item: PlaceContributionFeedItem
  place: Place | null
  fiction: FictionWithMedia | null
  contributorContext: ContributorModerationContext | null
}

export async function StaffPlaceContributionDetail({
  item,
  place,
  fiction,
  contributorContext,
}: StaffPlaceContributionDetailProps) {
  const t = await getTranslations("Contributions")
  const tPlaces = await getTranslations("Places")
  const isAddPhoto = isPlaceAddPhotoContribution(item)
  const isLinkRelationship = isLinkPlaceRelationshipContribution(item)
  const proposed = item.proposedPlaceRelationship
  const photoContext = isAddPhoto ? await getPlacePhotoContributeContextAction(item.entityId) : null
  const placeTitle = place?.name?.trim() || item.placeName?.trim() || t("feedCard_untitledPlace")
  const avatarSrc = place?.image?.trim() || item.placeAvatarUrl?.trim() || DEFAULT_FICTION_COVER
  const currentPhotoSrc =
    isAddPhoto && photoContext?.currentImageUrl?.trim()
      ? photoContext.currentImageUrl.trim()
      : avatarSrc
  const proposedLgPath = getPendingPathsForRole(item.pendingImagesByRole, "avatar")?.lg
  const proposedSrc = proposedLgPath ? publicAssetImageUrl(proposedLgPath) : null
  const fictionTitle = fiction?.title?.trim() || item.fictionTitle?.trim() || "—"
  const streetViewReference = place?.location.streetViewReference ?? null

  return (
    <div className="flex flex-col">
      <section className="border-b border-border/60 pb-8 sm:pb-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
          <div className="relative mx-auto h-[7.5rem] w-32 shrink-0 overflow-hidden rounded-xl border border-border bg-muted sm:mx-0 sm:h-36 sm:w-40">
            <Image src={avatarSrc} alt={placeTitle} fill className="object-cover" sizes="160px" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted-foreground">{fictionTitle}</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{placeTitle}</h1>
            <p className="mt-3 max-w-2xl whitespace-pre-wrap text-sm leading-relaxed text-foreground/90 sm:text-base">
              {place?.description?.trim()
                ? place.description.trim()
                : place
                  ? t("detailReviewNoDescription")
                  : t("placeUnavailable")}
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
        <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-foreground">{t("sectionPlaceDetails")}</h2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">{t("sectionPlaceDetailsHelp")}</p>
        <dl className="mt-3 divide-y divide-border/50 rounded-lg border border-border/60 bg-muted/15">
          {place ? (
            <>
              <div className="flex flex-col gap-0.5 px-3 py-2 sm:flex-row sm:items-baseline sm:gap-4">
                <dt className="shrink-0 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground sm:w-36">
                  {t("fieldParentFiction")}
                </dt>
                <dd className="text-sm text-foreground sm:flex-1">{fictionTitle}</dd>
              </div>
              <div className="flex flex-col gap-0.5 px-3 py-2 sm:flex-row sm:items-baseline sm:gap-4">
                <dt className="shrink-0 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground sm:w-36">
                  {t("fieldPlaceName")}
                </dt>
                <dd className="text-sm text-foreground sm:flex-1">{place.name?.trim() || "—"}</dd>
              </div>
              <div className="flex flex-col gap-0.5 px-3 py-2 sm:flex-row sm:items-baseline sm:gap-4">
                <dt className="shrink-0 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground sm:w-36">
                  {t("fieldLocationName")}
                </dt>
                <dd className="text-sm text-foreground sm:flex-1">{place.location.name || "—"}</dd>
              </div>
              <div className="flex flex-col gap-0.5 px-3 py-2 sm:flex-row sm:items-start sm:gap-4">
                <dt className="shrink-0 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground sm:w-36">
                  {t("fieldAddress")}
                </dt>
                <dd className="min-w-0 text-sm leading-snug text-foreground sm:flex-1">
                  {place.location.address?.trim() || "—"}
                </dd>
              </div>
              {place.shootEnvironment ? (
                <div className="flex flex-col gap-0.5 px-3 py-2 sm:flex-row sm:items-center sm:gap-4">
                  <dt className="shrink-0 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground sm:w-36">
                    {tPlaces("fieldShootEnvironment")}
                  </dt>
                  <dd className="sm:flex-1">
                    <PlaceShootEnvironmentBadge value={place.shootEnvironment} />
                  </dd>
                </div>
              ) : null}
            </>
          ) : (
            <div className="px-3 py-3">
              <dd className="text-sm text-muted-foreground">{t("placeUnavailable")}</dd>
            </div>
          )}
        </dl>
      </section>

      {isAddPhoto ? (
        <section className="border-b border-border/60 py-6">
          <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-foreground">
            {t("sectionAddPhotoReview")}
          </h2>
          <div className="mx-auto mt-4 grid w-full max-w-3xl gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                {t("addPhotoCurrent")}
              </p>
              <div className="relative aspect-[21/9] w-full overflow-hidden rounded-xl border border-border bg-muted/30">
                <Image src={currentPhotoSrc} alt={placeTitle} fill className="object-cover" sizes="400px" />
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                {t("addPhotoProposed")}
              </p>
              <div className="relative aspect-[21/9] w-full overflow-hidden rounded-xl border border-border bg-muted/30">
                {proposedSrc ? (
                  <Image src={proposedSrc} alt={placeTitle} fill className="object-cover" sizes="400px" />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    {t("addPhotoProposedMissing")}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="border-b border-border/60 py-6">
          <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-foreground">
            {t("sectionPhotoStreetViewVerification")}
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
            {t("sectionPhotoStreetViewVerificationHelp")}
          </p>
          <div className="mx-auto mt-4 flex w-full max-w-3xl flex-col gap-6">
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                {t("fieldSubmittedPhoto")}
              </p>
              <div className="relative aspect-video min-h-[min(52vw,280px)] w-full overflow-hidden rounded-xl border border-border bg-muted/30 sm:min-h-[320px]">
                <Image src={avatarSrc} alt={placeTitle} fill className="object-cover" sizes="(max-width: 768px) 100vw, 768px" />
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                {t("fieldStreetViewReference")}
              </p>
              {streetViewReference ? (
                <StreetViewReferencePreview
                  reference={streetViewReference}
                  className="min-h-[min(58vw,320px)] sm:min-h-[380px]"
                />
              ) : (
                <div className="flex aspect-video min-h-[200px] w-full items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/15 px-4 text-center text-sm text-muted-foreground">
                  {t("streetViewReferenceMissing")}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {isLinkRelationship && proposed ? (
        <section className="border-b border-border/60 py-10">
          <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-foreground">
            {t("sectionProposedPlaceRelationship")}
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            {t("sectionProposedPlaceRelationshipHelp")}
          </p>
          <div className="mt-6 max-w-2xl space-y-2 rounded-xl border border-border bg-card/40 p-4 text-sm">
            <p>
              <span className="text-muted-foreground">{t("fieldType")}</span>{" "}
              <span className="font-medium text-foreground">
                {proposed.kind === "shared_clone"
                  ? t("proposedRelationshipSharedClone")
                  : t("proposedRelationshipComposite")}
              </span>
            </p>
            {proposed.kind === "shared_clone" ? (
              <>
                <p>
                  <span className="text-muted-foreground">{t("proposedRelationshipSource")}</span>{" "}
                  {proposed.sourcePlaceName ?? proposed.sourcePlaceId}
                </p>
                <p>
                  <span className="text-muted-foreground">{t("proposedRelationshipTargetFiction")}</span>{" "}
                  {proposed.targetFictionTitle ?? proposed.targetFictionId}
                </p>
                <p>
                  <span className="text-muted-foreground">{t("proposedRelationshipNewPlace")}</span>{" "}
                  {proposed.placeName}
                </p>
              </>
            ) : (
              <>
                <p>
                  <span className="text-muted-foreground">{t("proposedRelationshipPlaceA")}</span>{" "}
                  {proposed.placeAName ?? proposed.placeAId}
                </p>
                <p>
                  <span className="text-muted-foreground">{t("proposedRelationshipPlaceB")}</span>{" "}
                  {proposed.placeBName ?? proposed.placeBId}
                </p>
                <p>
                  <span className="text-muted-foreground">{t("proposedRelationshipGroup")}</span>{" "}
                  {proposed.groupName}
                </p>
              </>
            )}
          </div>
        </section>
      ) : null}

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
            href={`/contributions?submitter=${encodeURIComponent(item.userId)}&kind=place`}
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
