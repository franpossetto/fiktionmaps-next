import { getTranslations } from "next-intl/server"
import Image from "next/image"
import { Clapperboard } from "lucide-react"
import { Link } from "@/i18n/navigation"
import {
  getPendingPathsForRole,
  isPlaceContributionFeedItem,
  isSceneContributionFeedItem,
  isFictionAddPhotoContribution,
  type StaffCreateContributionFeedItem,
  type StaffContributionsFeedKind,
} from "@/src/contributions/domain/contribution.entity"
import { contributionTypeMessageKey } from "@/components/contributions/contribution-type-label"
import { DEFAULT_FICTION_COVER } from "@/lib/constants/placeholders"
import { publicAssetImageUrl } from "@/lib/asset-images/public-asset-url"
import { UserAvatar } from "@/components/ui/user-avatar"
import { cn } from "@/lib/utils"
import type { ContributionsFeedTab } from "@/components/contributions/contributions-feed-tab-bar"

function contributorHandleLabel(c: StaffCreateContributionFeedItem["contributor"]): string {
  if (c.username?.trim()) return `@${c.username.trim()}`
  return `·${c.id.slice(0, 8)}`
}

function statusBadgeClass(status: StaffCreateContributionFeedItem["status"]): string {
  switch (status) {
    case "pending":
      return "bg-amber-100 text-amber-950 ring-1 ring-amber-200/90 dark:bg-amber-950/55 dark:text-amber-100 dark:ring-amber-700/50"
    case "approved":
      return "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
    case "rejected":
      return "bg-destructive/10 text-destructive"
  }
}

/** Per-kind message key suffix: fiction has none, place/scene have their own set, "all" only has one for the base (untabbed) state. */
function feedKindSuffix(feedKind: StaffContributionsFeedKind): "" | "Place" | "Scene" {
  if (feedKind === "place") return "Place"
  if (feedKind === "scene") return "Scene"
  return ""
}

function emptyMessageKeys(
  feedKind: StaffContributionsFeedKind,
  submitterFiltered: boolean,
  statusTab: ContributionsFeedTab,
): { title: string; body: string } {
  const suffix = feedKindSuffix(feedKind)
  if (submitterFiltered && statusTab === "pending") {
    return {
      title: `feedEmptyFilteredPending${suffix}Title`,
      body: `feedEmptyFilteredPending${suffix}`,
    }
  }
  if (submitterFiltered && statusTab === "approved") {
    return {
      title: `feedEmptyFilteredApproved${suffix}Title`,
      body: `feedEmptyFilteredApproved${suffix}`,
    }
  }
  if (submitterFiltered && statusTab === "rejected") {
    return {
      title: `feedEmptyFilteredRejected${suffix}Title`,
      body: `feedEmptyFilteredRejected${suffix}`,
    }
  }
  if (submitterFiltered) {
    return {
      title: `feedEmptyFiltered${suffix}Title`,
      body: `feedEmptyFiltered${suffix}`,
    }
  }
  if (statusTab === "pending") {
    return {
      title: `feedEmptyTabPending${suffix}Title`,
      body: `feedEmptyTabPending${suffix}`,
    }
  }
  if (statusTab === "approved") {
    return {
      title: `feedEmptyTabApproved${suffix}Title`,
      body: `feedEmptyTabApproved${suffix}`,
    }
  }
  if (statusTab === "rejected") {
    return {
      title: `feedEmptyTabRejected${suffix}Title`,
      body: `feedEmptyTabRejected${suffix}`,
    }
  }
  const baseSuffix = feedKind === "all" ? "All" : suffix
  return {
    title: `feedEmpty${baseSuffix}Title`,
    body: `feedEmpty${baseSuffix}`,
  }
}

export async function ContributionsFeedList({
  items,
  emptyContext,
}: {
  items: StaffCreateContributionFeedItem[]
  emptyContext?: {
    submitterFiltered: boolean
    statusTab: ContributionsFeedTab
    feedKind: StaffContributionsFeedKind
  }
}) {
  const t = await getTranslations("Contributions")

  if (items.length === 0) {
    const submitterFiltered = emptyContext?.submitterFiltered ?? false
    const statusTab = emptyContext?.statusTab ?? "all"
    const feedKind = emptyContext?.feedKind ?? "fiction"
    const { title, body } = emptyMessageKeys(feedKind, submitterFiltered, statusTab)
    return (
      <div className="border-t border-border/60 py-8 text-center">
        <p className="text-sm font-medium text-foreground">{t(title)}</p>
        <p className="mt-1 text-sm text-muted-foreground">{t(body)}</p>
      </div>
    )
  }

  return (
    <ul className="pt-1">
      {items.map((item, idx) => {
        const isPlace = isPlaceContributionFeedItem(item)
        const isScene = isSceneContributionFeedItem(item)
        const title = isPlace
          ? item.placeName?.trim() || t("feedCard_untitledPlace")
          : isScene
            ? item.sceneTitle?.trim() || t("feedCard_untitledScene")
            : item.fictionTitle?.trim() || t("feedCard_untitledFiction")
        const fictionProposedLg = !isPlace && !isScene
          ? getPendingPathsForRole(item.pendingImagesByRole, "cover")?.lg
          : null
        const fictionProposed =
          !isScene && isFictionAddPhotoContribution(item) && fictionProposedLg
            ? publicAssetImageUrl(fictionProposedLg)
            : null
        const coverSrc = isPlace
          ? item.placeAvatarUrl?.trim() || DEFAULT_FICTION_COVER
          : isScene
            ? null
            : fictionProposed || item.fictionCoverUrl?.trim() || DEFAULT_FICTION_COVER
        const sceneVideoSrc = isScene
          ? item.scenePreviewUrl?.trim() || item.sceneVideoUrl?.trim() || null
          : null
        const subtitle = isScene
          ? [
              item.fictionTitle?.trim(),
              item.type === "add_place_to_scene"
                ? item.proposedPlaces
                    .map((p) => p.name?.trim())
                    .filter(Boolean)
                    .join(" → ") || null
                : item.placeNames.length > 0
                  ? item.placeNames.join(", ")
                  : null,
            ]
              .filter(Boolean)
              .join(" · ") || null
          : isPlace && item.fictionTitle?.trim()
            ? item.fictionTitle.trim()
            : null

        return (
          <li key={item.id} className={cn("border-t border-border/60", idx === 0 && "border-t-0")}>
            <Link
              href={`/contributions/${item.id}`}
              className={cn(
                "group -mx-2 flex cursor-pointer gap-3 rounded-lg px-2 py-3.5 transition-colors sm:-mx-3 sm:px-3",
                item.status === "pending"
                  ? "bg-amber-50/95 hover:bg-amber-100/95 dark:bg-amber-950/22 dark:hover:bg-amber-950/35"
                  : "hover:bg-muted/[0.35]",
              )}
            >
              <div
                className={cn(
                  "relative h-14 w-14 shrink-0 overflow-hidden border border-border bg-muted sm:h-16 sm:w-16",
                  isPlace ? "rounded-lg" : isScene ? "rounded-lg" : "rounded-full",
                )}
              >
                {isScene ? (
                  sceneVideoSrc ? (
                    <video
                      src={sceneVideoSrc}
                      muted
                      playsInline
                      preload="metadata"
                      className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover"
                      aria-hidden
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                      <Clapperboard className="h-6 w-6 opacity-60" aria-hidden />
                    </div>
                  )
                ) : (
                  <Image
                    src={coverSrc ?? DEFAULT_FICTION_COVER}
                    alt={title}
                    fill
                    className="object-cover object-center transition-opacity duration-300 group-hover:opacity-95"
                    sizes="(max-width:640px) 56px, 64px"
                  />
                )}
              </div>

              <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                      statusBadgeClass(item.status),
                    )}
                  >
                    {t(`status_${item.status}`)}
                  </span>
                  <span className="rounded bg-muted/80 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-foreground/90">
                    {t(contributionTypeMessageKey(item.type))}
                  </span>
                </div>

                <h2 className="text-base font-bold leading-snug tracking-tight text-foreground transition-colors group-hover:text-primary sm:text-lg">
                  {title}
                </h2>

                {subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null}

                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                  <span className="inline-flex min-w-0 max-w-full items-center gap-1.5">
                    <UserAvatar
                      avatarId={item.contributor.avatarUrl}
                      fallback={(item.contributor.username?.trim().charAt(0) || item.contributor.id.charAt(0)).toUpperCase()}
                      className="h-4 w-4 shrink-0 border border-border/60 text-[8px]"
                    />
                    <span className="min-w-0 truncate font-medium text-foreground" title={item.contributor.id}>
                      {contributorHandleLabel(item.contributor)}
                    </span>
                  </span>
                  <span className="hidden text-border sm:inline" aria-hidden>
                    ·
                  </span>
                  <time className="shrink-0 tabular-nums" dateTime={item.createdAt}>
                    {new Date(item.createdAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                  </time>
                </div>
              </div>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
