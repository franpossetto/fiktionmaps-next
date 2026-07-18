import { getTranslations } from "next-intl/server"
import { TopContributorsSection } from "@/components/contributions/top-contributors-section"
import type { FictionContributorRankedProfile } from "@/src/contributions/domain/contribution.entity"

export async function CityDetailRightRail({
  fictionCount,
  placeCount,
  contributors,
}: {
  fictionCount: number
  placeCount: number
  contributors: FictionContributorRankedProfile[]
}) {
  const t = await getTranslations("Cities")
  const showContributors = contributors.length > 0

  return (
    <div className="w-full space-y-4">
      <section className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-foreground">
          {t("statisticsHeading")}
        </p>
        <dl className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">{t("fictionsHeading")}</dt>
            <dd className="font-medium tabular-nums text-foreground">{fictionCount}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">{t("placesHeading")}</dt>
            <dd className="font-medium tabular-nums text-foreground">{placeCount}</dd>
          </div>
        </dl>
      </section>

      {showContributors && (
        <TopContributorsSection
          contributors={contributors}
          title={t("contributorsHeading")}
          nameFallback={t("contributorNameFallback")}
          showBorderTop
        />
      )}
    </div>
  )
}
