import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { Link, redirect } from "@/i18n/navigation"
import { FictionContributeLayout } from "@/components/contribute/fiction/fiction-contribute-layout"
import { buildContributionsFeedHref } from "@/components/contributions/contributions-feed-href"
import { ContributionsFeedList } from "@/components/contributions/contributions-feed-list"
import { ContributionsFeedPagination } from "@/components/contributions/contributions-feed-pagination"
import { ContributionsFeedTabBar, type ContributionsFeedTab } from "@/components/contributions/contributions-feed-tab-bar"
import { ContributionsRightRail } from "@/components/contributions/contributions-right-rail"
import { STAFF_FICTION_CONTRIBUTIONS_FEED_PAGE_SIZE } from "@/src/contributions/domain/contribution.config"
import {
  getFictionContributionsFeedPageForStaffSession,
  getTopContributorsCached,
} from "@/src/contributions/infrastructure/next/contribution.queries"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Contributions")
  return { title: t("metaTitle") }
}

function parseStatusTab(raw: string | undefined): ContributionsFeedTab {
  const s = raw?.trim().toLowerCase() ?? ""
  if (s === "pending" || s === "approved") return s
  return "all"
}

function parsePage(raw: string | undefined): number {
  const n = Number.parseInt(raw ?? "1", 10)
  if (!Number.isFinite(n) || n < 1) return 1
  return n
}

export default async function ContributionsStaffPage({
  searchParams,
}: {
  searchParams: Promise<{ submitter?: string; status?: string; page?: string }>
}) {
  const { submitter: submitterParam, status: statusParam, page: pageParam } = await searchParams
  const submitter = submitterParam?.trim() ?? ""
  const statusTab = parseStatusTab(statusParam)
  const requestedPage = parsePage(pageParam)

  const t = await getTranslations("Contributions")
  const [{ items, totalCount }, topContributors] = await Promise.all([
    getFictionContributionsFeedPageForStaffSession({
      page: requestedPage,
      statusTab,
      submitterUserId: submitter,
    }),
    getTopContributorsCached(14),
  ])

  const pageSize = STAFF_FICTION_CONTRIBUTIONS_FEED_PAGE_SIZE
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const canonicalPage = Math.min(requestedPage, totalPages)

  if (requestedPage !== canonicalPage) {
    redirect(buildContributionsFeedHref(statusTab, submitter, canonicalPage > 1 ? canonicalPage : undefined))
  }

  return (
    <FictionContributeLayout leftAside={null} rightAside={<ContributionsRightRail contributors={topContributors} variant="feed" />}>
      <div className="w-full min-w-0 px-4 pb-8 sm:px-5">
        {submitter ? (
          <div className="mb-4 flex flex-col gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
            <p className="text-sm text-muted-foreground">{t("feedFilteredBySubmitter")}</p>
            <Link
              href="/contributions"
              className="shrink-0 text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              {t("feedFilteredShowAll")}
            </Link>
          </div>
        ) : null}
        <ContributionsFeedTabBar
          active={statusTab}
          submitter={submitter}
          navAriaLabel={t("feedTabsNavAria")}
          labelAll={t("feedTab_all")}
          labelPending={t("feedTab_pending")}
          labelApproved={t("feedTab_approved")}
        />
        <ContributionsFeedList
          items={items}
          emptyContext={{ submitterFiltered: Boolean(submitter), statusTab }}
        />
        <ContributionsFeedPagination
          currentPage={canonicalPage}
          totalCount={totalCount}
          pageSize={pageSize}
          statusTab={statusTab}
          submitter={submitter}
        />
      </div>
    </FictionContributeLayout>
  )
}
