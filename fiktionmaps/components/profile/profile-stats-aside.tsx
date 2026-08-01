"use client"

import { useTranslations } from "next-intl"

type ProfileStatsAsideProps = {
  fppTotal: number
  contributionCount: number
  joinYear: number
}

export function ProfileStatsAside({
  fppTotal,
  contributionCount,
  joinYear,
}: ProfileStatsAsideProps) {
  const t = useTranslations("Profile")

  return (
    <section className="space-y-2">
      <h2 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {t("statsHeading")}
      </h2>
      <dl className="overflow-hidden rounded-xl bg-muted/25">
        <div className="flex items-baseline justify-between gap-3 px-3 py-2.5">
          <dt className="text-xs text-muted-foreground">{t("statsFpp")}</dt>
          <dd className="text-sm font-semibold tabular-nums text-foreground">
            {fppTotal.toLocaleString()}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-3 border-t border-border/40 px-3 py-2.5">
          <dt className="text-xs text-muted-foreground">{t("statsContributions")}</dt>
          <dd className="text-sm font-semibold tabular-nums text-foreground">
            {contributionCount.toLocaleString()}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-3 border-t border-border/40 px-3 py-2.5">
          <dt className="text-xs text-muted-foreground">{t("statsMemberSince")}</dt>
          <dd className="text-sm font-semibold tabular-nums text-foreground">{joinYear}</dd>
        </div>
      </dl>
    </section>
  )
}
