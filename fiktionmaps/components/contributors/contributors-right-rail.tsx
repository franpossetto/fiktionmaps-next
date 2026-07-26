import { getTranslations } from "next-intl/server"
import type { CatalogEntityCounts } from "@/src/shared/application/get-catalog-entity-counts.usecase"

export async function ContributorsRightRail({
  catalogCounts,
}: {
  catalogCounts: CatalogEntityCounts
}) {
  const t = await getTranslations("Contributors")

  return (
    <div className="w-full space-y-4">
      <section className="space-y-2" aria-label={t("statsAria")}>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-foreground">
          {t("statisticsHeading")}
        </p>
        <dl className="inline-grid grid-cols-[auto_auto] items-baseline gap-x-4 gap-y-2 text-sm">
          <dt className="text-muted-foreground">{t("statFictions")}</dt>
          <dd className="text-right font-medium tabular-nums text-foreground">
            {catalogCounts.fictionCount.toLocaleString()}
          </dd>
          <dt className="text-muted-foreground">{t("statCities")}</dt>
          <dd className="text-right font-medium tabular-nums text-foreground">
            {catalogCounts.cityCount.toLocaleString()}
          </dd>
          <dt className="text-muted-foreground">{t("statPlaces")}</dt>
          <dd className="text-right font-medium tabular-nums text-foreground">
            {catalogCounts.placeCount.toLocaleString()}
          </dd>
        </dl>
      </section>
    </div>
  )
}
