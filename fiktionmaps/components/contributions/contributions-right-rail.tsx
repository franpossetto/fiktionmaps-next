import type { ReactNode } from "react"
import { getTranslations } from "next-intl/server"
import { ContributionsFeedSidebar } from "@/components/contributions/contributions-feed-sidebar"
import type { TopContributorProfile } from "@/src/contributions/domain/contribution.entity"
import { cn } from "@/lib/utils"

type FeedProps = {
  variant: "feed"
  contributors: TopContributorProfile[]
}

type DetailProps = {
  variant: "detail"
  contributors?: TopContributorProfile[]
  /** Bloque de revisión (obra, estado, acciones) */
  reviewRail?: ReactNode
}

export async function ContributionsRightRail(props: FeedProps | DetailProps) {
  const t = await getTranslations("Contributions")

  return (
    <div className={cn("w-full min-w-0 max-w-full space-y-6")}>
      {props.variant === "feed" ? (
        <>
          <header className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{t("headerKicker")}</p>
            <h1 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">{t("title")}</h1>
            <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">{t("subtitleFeed")}</p>
          </header>
          <div className="border-t border-border/60 pt-6">
            <ContributionsFeedSidebar contributors={props.contributors} />
          </div>
        </>
      ) : (
        <>
          {props.reviewRail ? <div>{props.reviewRail}</div> : null}
          {props.contributors && props.contributors.length > 0 ? (
            <div className="border-t border-border/60 pt-6">
              <ContributionsFeedSidebar contributors={props.contributors} />
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}
