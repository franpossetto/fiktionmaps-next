import { getTranslations } from "next-intl/server"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Link } from "@/i18n/navigation"
import { buildContributionsFeedHref, type ContributionsFeedTab } from "@/components/contributions/contributions-feed-href"
import type { StaffContributionsFeedKind } from "@/src/contributions/domain/contribution.entity"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export async function ContributionsFeedPagination(props: {
  currentPage: number
  totalCount: number
  pageSize: number
  statusTab: ContributionsFeedTab
  submitter: string
  kind?: StaffContributionsFeedKind
}) {
  const { currentPage, totalCount, pageSize, statusTab, submitter, kind = "fiction" } = props
  const t = await getTranslations("Contributions")

  if (totalCount <= pageSize) return null

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const safePage = Math.min(Math.max(1, currentPage), totalPages)

  const prevPage = safePage > 1 ? safePage - 1 : null
  const nextPage = safePage < totalPages ? safePage + 1 : null

  const prevHref = prevPage != null ? buildContributionsFeedHref(statusTab, submitter, prevPage, kind) : undefined
  const nextHref = nextPage != null ? buildContributionsFeedHref(statusTab, submitter, nextPage, kind) : undefined

  return (
    <nav
      className="mt-6 flex flex-col items-center gap-3 border-t border-border/60 pt-6 sm:flex-row sm:justify-between"
      aria-label={t("feedPaginationNavAria")}
    >
      <p className="text-sm text-muted-foreground">
        {t("feedPaginationSummary", { current: safePage, total: totalPages })}
      </p>
      <div className="flex items-center gap-2">
        {prevHref ? (
          <Link
            href={prevHref}
            prefetch
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5 pl-2")}
            aria-label={t("feedPaginationPrevAria")}
          >
            <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden />
            {t("feedPaginationPrev")}
          </Link>
        ) : (
          <span
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "pointer-events-none gap-1.5 pl-2 opacity-40",
            )}
            aria-disabled
          >
            <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden />
            {t("feedPaginationPrev")}
          </span>
        )}
        {nextHref ? (
          <Link
            href={nextHref}
            prefetch
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5 pr-2")}
            aria-label={t("feedPaginationNextAria")}
          >
            {t("feedPaginationNext")}
            <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
          </Link>
        ) : (
          <span
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "pointer-events-none gap-1.5 pr-2 opacity-40",
            )}
            aria-disabled
          >
            {t("feedPaginationNext")}
            <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
          </span>
        )}
      </div>
    </nav>
  )
}
