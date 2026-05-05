import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { getAllFictionsCached } from "@/src/fictions/infrastructure/next/fiction.queries"
import { getSceneCountsByFictionIdsCached } from "@/src/scenes/infrastructure/next/scene.queries"
import { getFictionLikeCountsCached } from "@/src/fiction-likes/infrastructure/next/fiction-likes.queries"
import { getPlaceCountsByFictionIdsCached } from "@/src/places/infrastructure/next/place.queries"
import { FictionLanding } from "@/components/fictions/fiction-landing"
import { RecentFictionsSidebar } from "@/components/fictions/recent-fictions-sidebar"
import { getSiteUrl } from "@/lib/site"
import { Link } from "@/i18n/navigation"

type Props = {
  params: Promise<{ locale: string }>
  searchParams?: Promise<{ q?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const siteUrl = getSiteUrl()
  const canonical = `${siteUrl}/${locale}/fictions`
  const tMeta = await getTranslations({ locale, namespace: "Metadata" })
  const title = tMeta("fictionsListTitle")
  const description = tMeta("fictionsListDescription")
  return {
    title,
    description,
    alternates: {
      canonical,
      languages: {
        en: `${siteUrl}/en/fictions`,
        es: `${siteUrl}/es/fictions`,
      },
    },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  }
}

export default async function FictionsPage({ params, searchParams }: Props) {
  const { locale } = await params
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const initialSearch = resolvedSearchParams?.q?.trim() ?? ""
  const all = await getAllFictionsCached()
  const fictions = all.filter((f) => f.active)
  const allIds = fictions.map((f) => f.id)
  const t = await getTranslations({ locale, namespace: "Fictions" })

  const [sceneCounts, likeCounts, placeCounts] = await Promise.all([
    getSceneCountsByFictionIdsCached(allIds),
    getFictionLikeCountsCached(allIds),
    getPlaceCountsByFictionIdsCached(allIds),
  ])

  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="mx-auto grid min-h-full max-w-[1900px] grid-cols-1 lg:[grid-template-columns:13%_14%_61%_0%_12%] xl:[grid-template-columns:13%_14%_47%_14%_12%]">
        <div className="hidden lg:block" aria-hidden />
        <div
          className="hidden border-r border-border/50 pl-1 lg:block"
          aria-hidden
        />
        <main className="min-w-0 border-x border-border/50 max-lg:min-h-full lg:border-x-0">
          <FictionLanding
            initialFictions={fictions}
            initialSceneCounts={sceneCounts}
            initialLikeCounts={likeCounts}
            initialPlaceCounts={placeCounts}
            initialSearch={initialSearch}
          />
        </main>
        <aside className="hidden border-l border-border/50 px-2.5 pb-8 pt-14 xl:block">
          <div className="sticky top-14 w-full max-w-[208px]">
            <RecentFictionsSidebar initialFictions={fictions} />

            <section className="mt-4 rounded-md bg-muted/40 p-3">
              <h4 className="text-sm font-semibold text-foreground">{t("becomeContributor")}</h4>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {t("contributorBody")}
              </p>
              <Link
                href="/map"
                className="mt-2 inline-flex h-8 items-center rounded-md bg-foreground px-3 text-xs font-medium text-background transition-opacity hover:opacity-90"
              >
                {t("startContributing")}
              </Link>
            </section>
          </div>
        </aside>
        <div className="hidden lg:block" aria-hidden />
      </div>
    </div>
  )
}
