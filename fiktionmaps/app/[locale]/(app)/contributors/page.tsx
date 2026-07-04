import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { getProfilesPageCached } from "@/src/users/infrastructure/next/user.queries"
import { ContributorsPage } from "@/components/contributors/contributors-page"
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

  const { profiles, totalCount } = await getProfilesPageCached(page, PAGE_SIZE)
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  return (
    <div className="h-full overflow-y-auto bg-background">
      <ContributorsPage
        contributors={profiles}
        page={page}
        totalPages={totalPages}
        totalCount={totalCount}
        pageSize={PAGE_SIZE}
      />
    </div>
  )
}
