"use client"

import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { Sparkles } from "lucide-react"
import { PageBreadcrumb } from "@/components/navigation/page-breadcrumb"
import { FictionContributeLayout } from "@/components/contribute/fiction/fiction-contribute-layout"
import { TopContributorsSection } from "@/components/contributions/top-contributors-section"
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
  isContributor: boolean
  isAIAvailable: boolean
}

export function ProfileContributeHub({ topContributors, isContributor, isAIAvailable }: ProfileContributeHubProps) {
  const t = useTranslations("Contribute.hub")
  const tHunt = useTranslations("Contribute.huntWork")
  const tProfile = useTranslations("Profile")
  const tContrib = useTranslations("Contributions")

  return (
    <FictionContributeLayout
      leftAside={<ProfileContributeHubLeftAside />}
      rightAside={
        <div className="w-full min-w-0 max-w-full pt-1">
          <TopContributorsSection
            contributors={topContributors}
            title={tContrib("topContributorsTitle")}
            emptyMessage={tContrib("topContributorsEmpty")}
            initialLimit={6}
            viewMoreLabel={tContrib("viewMoreContributors")}
            nameFallback={tContrib("contributorNameFallback")}
          />
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

        {isContributor && isAIAvailable && (
          <Link
            href="/contribute/hunt"
            className="mt-6 flex items-center gap-3 rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-3 transition-colors hover:border-violet-500/50 hover:bg-violet-500/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/20 text-violet-700 dark:text-violet-300">
              <Sparkles className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-foreground">{tHunt("title")}</span>
              <span className="block text-xs text-muted-foreground">{tHunt("subtitle")}</span>
            </span>
          </Link>
        )}

        <ul
          className="mt-8 grid auto-rows-fr grid-cols-1 items-stretch gap-3 sm:grid-cols-2 sm:gap-4"
          aria-label={t("listAria")}
        >
          {CONTRIBUTION_TYPES_CATALOG.filter((e) => !e.aiRequired || isAIAvailable).map(({ id, type, icon: Icon, hasWizard, href, tag, requiresContributor }) => {
            const key = id ?? type
            const label = t(`types.${key}.title`)
            const description = t(`types.${key}.description`)
            const fpp = CONTRIBUTION_FPP[type]
            const isEnabled = hasWizard && (!requiresContributor || isContributor)

            const cardClass = cn(
              "relative block h-full w-full rounded-xl border px-3 py-3 pt-3.5 text-left transition-[border-color,box-shadow,background-color]",
              isEnabled
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
                      isEnabled
                        ? "bg-emerald-500/15 dark:bg-emerald-500/20"
                        : "bg-muted/80",
                    )}
                  >
                    <span
                      className={cn(
                        "text-base font-bold tabular-nums",
                        isEnabled
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-muted-foreground/70",
                      )}
                    >
                      {fpp}
                    </span>
                    <span
                      className={cn(
                        "text-[10px] font-semibold uppercase tracking-wider",
                        isEnabled
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
                      isEnabled ? "bg-muted/80 text-foreground" : "bg-muted/50 text-muted-foreground/50",
                    )}
                  >
                    <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1 space-y-1">
                    <p
                      className={cn(
                        "line-clamp-1 text-sm font-semibold leading-tight",
                        isEnabled ? "text-foreground" : "text-muted-foreground/80",
                      )}
                    >
                      {label}
                    </p>
                    <p
                      className={cn(
                        "line-clamp-2 min-h-9 text-xs leading-snug",
                        isEnabled ? "text-muted-foreground" : "text-muted-foreground/55",
                      )}
                    >
                      {description}
                    </p>
                  </div>
                </div>
              </>
            )

            if (isEnabled && href) {
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
