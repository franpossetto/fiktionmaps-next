"use client"

import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { PageBreadcrumb } from "@/components/navigation/page-breadcrumb"
import { FictionContributeLayout } from "@/components/contribute/fiction/fiction-contribute-layout"
import { ContributionsFeedSidebar } from "@/components/contributions/contributions-feed-sidebar"
import { CONTRIBUTION_FPP } from "@/src/contributions/domain/contribution.config"
import type { TopContributorProfile } from "@/src/contributions/domain/contribution.entity"
import { CONTRIBUTION_TYPES_CATALOG } from "@/lib/contribute/contribution-types-catalog"
import { cn } from "@/lib/utils"

function ProfileContributeHubLeftAside() {
  const t = useTranslations("Contribute.hub.leftAside")

  return (
    <div className="mx-auto w-full max-w-full space-y-3 pt-1">
      <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{t("heading")}</h2>
      <div className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
        <p>{t("body1")}</p>
        <p className="mt-3">{t("body2")}</p>
      </div>
    </div>
  )
}

type ProfileContributeHubProps = {
  topContributors: TopContributorProfile[]
}

export function ProfileContributeHub({ topContributors }: ProfileContributeHubProps) {
  const t = useTranslations("Contribute.hub")
  const tProfile = useTranslations("Profile")

  return (
    <FictionContributeLayout
      leftAside={<ProfileContributeHubLeftAside />}
      rightAside={
        <div className="w-full min-w-0 max-w-full pt-1">
          <ContributionsFeedSidebar contributors={topContributors} />
        </div>
      }
    >
      <div className="w-full min-w-0 px-4 pb-10 sm:px-5">
        <PageBreadcrumb
          className="mb-6"
          items={[
            { label: tProfile("title"), href: "/profile" },
            { label: t("title") },
          ]}
        />

        <header className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{t("kicker")}</p>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{t("title")}</h1>
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">{t("subtitle")}</p>
        </header>

        <ul
          className="mt-8 grid auto-rows-fr grid-cols-1 items-stretch gap-3 sm:grid-cols-2 sm:gap-4"
          aria-label={t("listAria")}
        >
          {CONTRIBUTION_TYPES_CATALOG.map(({ id, type, icon: Icon, hasWizard, href, tag }) => {
            const key = id ?? type
            const label = t(`types.${key}.title`)
            const description = t(`types.${key}.description`)
            const fpp = CONTRIBUTION_FPP[type]

            const cardClass = cn(
              "relative block h-full w-full rounded-xl border px-3 py-3 pt-3.5 text-left transition-[border-color,box-shadow,background-color]",
              hasWizard
                ? "cursor-pointer border-border bg-card hover:border-foreground/45 hover:bg-muted/25 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                : "cursor-not-allowed border-border/40 bg-muted/30",
            )

            const cardInner = (
              <>
                <div
                  className="absolute right-2 top-2 flex flex-col items-end gap-1 leading-none"
                  aria-label={t("fppIfApproved", { count: fpp })}
                >
                  {tag && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-violet-500/15 px-1.5 py-1 dark:bg-violet-500/20">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-violet-700/90 dark:text-violet-400/90">
                        {tag}
                      </span>
                    </span>
                  )}
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-md px-1.5 py-1",
                      hasWizard
                        ? "bg-emerald-500/15 dark:bg-emerald-500/20"
                        : "bg-muted/80",
                    )}
                  >
                    <span
                      className={cn(
                        "text-base font-bold tabular-nums",
                        hasWizard
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-muted-foreground/70",
                      )}
                    >
                      {fpp}
                    </span>
                    <span
                      className={cn(
                        "text-[10px] font-semibold uppercase tracking-wider",
                        hasWizard
                          ? "text-emerald-700/90 dark:text-emerald-400/90"
                          : "text-muted-foreground/60",
                      )}
                    >
                      FPP
                    </span>
                  </span>
                </div>
                <div className="flex items-start gap-2.5 pr-14">
                  <span
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                      hasWizard ? "bg-muted/80 text-foreground" : "bg-muted/50 text-muted-foreground/50",
                    )}
                  >
                    <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1 space-y-1">
                    <p
                      className={cn(
                        "line-clamp-1 text-sm font-semibold leading-tight",
                        hasWizard ? "text-foreground" : "text-muted-foreground/80",
                      )}
                    >
                      {label}
                    </p>
                    <p
                      className={cn(
                        "line-clamp-2 min-h-9 text-xs leading-snug",
                        hasWizard ? "text-muted-foreground" : "text-muted-foreground/55",
                      )}
                    >
                      {description}
                    </p>
                  </div>
                </div>
              </>
            )

            if (hasWizard && href) {
              return (
                <li key={key} className="h-full min-h-0">
                  <Link href={href} className={cardClass}>
                    {cardInner}
                  </Link>
                </li>
              )
            }

            return (
              <li key={key} className="h-full min-h-0">
                <div className={cardClass} aria-disabled="true">
                  {cardInner}
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </FictionContributeLayout>
  )
}
