import { getTranslations } from "next-intl/server"
import Image from "next/image"
import { Link } from "@/i18n/navigation"
import type { FictionContributionFeedItem } from "@/src/contributions/domain/contribution.entity"
import { contributionTypeMessageKey } from "@/components/contributions/contribution-type-label"
import { DEFAULT_FICTION_COVER } from "@/lib/constants/placeholders"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import type { ContributionsFeedTab } from "@/components/contributions/contributions-feed-tab-bar"

function contributorHandleLabel(c: FictionContributionFeedItem["contributor"]): string {
  if (c.username?.trim()) return `@${c.username.trim()}`
  return `·${c.id.slice(0, 8)}`
}

function statusBadgeClass(status: FictionContributionFeedItem["status"]): string {
  switch (status) {
    case "pending":
      return "bg-amber-100 text-amber-950 ring-1 ring-amber-200/90 dark:bg-amber-950/55 dark:text-amber-100 dark:ring-amber-700/50"
    case "approved":
      return "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
    case "rejected":
      return "bg-destructive/10 text-destructive"
  }
}

export async function ContributionsFeedList({
  items,
  emptyContext,
}: {
  items: FictionContributionFeedItem[]
  emptyContext?: { submitterFiltered: boolean; statusTab: ContributionsFeedTab }
}) {
  const t = await getTranslations("Contributions")

  if (items.length === 0) {
    const submitterFiltered = emptyContext?.submitterFiltered ?? false
    const statusTab = emptyContext?.statusTab ?? "all"

    if (submitterFiltered && statusTab === "pending") {
      return (
        <div className="border-t border-border/60 py-8 text-center">
          <p className="text-sm font-medium text-foreground">{t("feedEmptyFilteredPendingTitle")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("feedEmptyFilteredPending")}</p>
        </div>
      )
    }
    if (submitterFiltered && statusTab === "approved") {
      return (
        <div className="border-t border-border/60 py-8 text-center">
          <p className="text-sm font-medium text-foreground">{t("feedEmptyFilteredApprovedTitle")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("feedEmptyFilteredApproved")}</p>
        </div>
      )
    }
    if (submitterFiltered) {
      return (
        <div className="border-t border-border/60 py-8 text-center">
          <p className="text-sm font-medium text-foreground">{t("feedEmptyFilteredTitle")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("feedEmptyFiltered")}</p>
        </div>
      )
    }
    if (statusTab === "pending") {
      return (
        <div className="border-t border-border/60 py-8 text-center">
          <p className="text-sm font-medium text-foreground">{t("feedEmptyTabPendingTitle")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("feedEmptyTabPending")}</p>
        </div>
      )
    }
    if (statusTab === "approved") {
      return (
        <div className="border-t border-border/60 py-8 text-center">
          <p className="text-sm font-medium text-foreground">{t("feedEmptyTabApprovedTitle")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("feedEmptyTabApproved")}</p>
        </div>
      )
    }
    return (
      <div className="border-t border-border/60 py-8 text-center">
        <p className="text-sm font-medium text-foreground">{t("feedEmptyTitle")}</p>
        <p className="mt-1 text-sm text-muted-foreground">{t("feedEmpty")}</p>
      </div>
    )
  }

  return (
    <ul className="pt-1">
      {items.map((item, idx) => {
        const title = item.fictionTitle?.trim() ? item.fictionTitle.trim() : t("feedCard_untitledFiction")
        const coverSrc = item.fictionCoverUrl?.trim() ? item.fictionCoverUrl.trim() : DEFAULT_FICTION_COVER
        return (
          <li
            key={item.id}
            className={cn("border-t border-border/60", idx === 0 && "border-t-0")}
          >
            <Link
              href={`/contributions/${item.id}`}
              className={cn(
                "group flex cursor-pointer gap-3 py-3.5 transition-colors -mx-2 px-2 sm:-mx-3 sm:px-3 rounded-lg",
                item.status === "pending"
                  ? "bg-amber-50/95 hover:bg-amber-100/95 dark:bg-amber-950/22 dark:hover:bg-amber-950/35"
                  : "hover:bg-muted/[0.35]",
              )}
            >
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border border-border bg-muted sm:h-16 sm:w-16">
                <Image
                  src={coverSrc}
                  alt={title}
                  fill
                  className="object-cover object-center transition-opacity duration-300 group-hover:opacity-95"
                  sizes="(max-width:640px) 56px, 64px"
                />
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

                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                  <span className="inline-flex min-w-0 max-w-full items-center gap-1.5">
                    <Avatar className="h-4 w-4 shrink-0 border border-border/60">
                      {item.contributor.avatarUrl ? <AvatarImage src={item.contributor.avatarUrl} alt="" /> : null}
                      <AvatarFallback className="text-[8px]">
                        {(item.contributor.username?.trim().charAt(0) || item.contributor.id.charAt(0)).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
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
