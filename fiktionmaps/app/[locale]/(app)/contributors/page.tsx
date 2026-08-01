import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { getProfilesPageCached } from "@/src/users/infrastructure/next/user.queries"
import { getCatalogEntityCountsCached } from "@/src/shared/infrastructure/next/catalog.queries"
import { AppDetailRailsShell } from "@/components/layout/app-detail-rails-shell"
import { ContributorsPage } from "@/components/contributors/contributors-page"
import { ContributorsRightRail } from "@/components/contributors/contributors-right-rail"
import { getSiteUrl } from "@/lib/site"

const PAGE_SIZE = 20

type Props = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ page?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const siteUrl = getSiteUrl()
  const canonical = `${siteUrl}/${locale}/contributors`
  const tMeta = await getTranslations({ locale, namespace: "Contributors" })
  const title = tMeta("metaTitle")
  return {
    title,
    alternates: {
      canonical,
      languages: {
        en: `${siteUrl}/en/contributors`,
        es: `${siteUrl}/es/contributors`,
      },
    },
  }
}

export default async function ContributorsRoute({ searchParams }: Props) {
  const { page: pageStr } = await searchParams
  const page = Math.max(1, parseInt(pageStr ?? "1", 10) || 1)

  const [{ profiles, totalCount }, catalogCounts] = await Promise.all([
    getProfilesPageCached(page, PAGE_SIZE),
    getCatalogEntityCountsCached(),
  ])
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  return (
    <AppDetailRailsShell rightAside={<ContributorsRightRail catalogCounts={catalogCounts} />}>
      <ContributorsPage
        contributors={profiles}
        page={page}
        totalPages={totalPages}
        totalCount={totalCount}
        pageSize={PAGE_SIZE}
      />
    </AppDetailRailsShell>
  )
}
