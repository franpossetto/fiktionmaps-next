import { getTranslations } from "next-intl/server"
import type { FictionContributionFeedItem } from "@/src/contributions/domain/contribution.entity"
import type { FictionWithMediaAndCatalogIds } from "@/src/fictions/domain/fiction.entity"
import { contributionTypeMessageKey } from "@/components/contributions/contribution-type-label"

function statusBadgeClass(status: FictionContributionFeedItem["status"]): string {
  switch (status) {
    case "pending":
      return "bg-amber-100 text-amber-950 ring-1 ring-amber-200/90 dark:bg-amber-950/55 dark:text-amber-100 dark:ring-amber-700/50"
    case "approved":
      return "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
    case "rejected":
      return "bg-destructive/10 text-destructive"
  }
}

export interface StaffContributionReviewRightAsideProps {
  item: FictionContributionFeedItem
  fiction: FictionWithMediaAndCatalogIds | null
  moderatorWho: string | null
}

/**
 * Carril derecho: metadatos de contribución (layout 3 columnas).
 * En viewport menor a 900px el aside derecho está oculto; la página duplica este bloque arriba del main.
 */
export async function StaffContributionReviewRightAside({
  item,
  fiction,
  moderatorWho,
}: StaffContributionReviewRightAsideProps) {
  const t = await getTranslations("Contributions")

  return (
    <div className="w-full min-w-0 max-w-full">
      <div className="min-[900px]:sticky min-[900px]:top-6">
        <section>
          {fiction ? null : (
            <p className="mb-6 text-sm text-muted-foreground">{t("fictionUnavailable")}</p>
          )}

          <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-foreground">{t("sectionContribution")}</h3>

          <dl className="mt-6 grid gap-6 text-sm">
            <div>
              <dt className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">{t("fieldType")}</dt>
              <dd className="mt-2 text-sm font-medium text-foreground">{t(contributionTypeMessageKey(item.type))}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                {t("detail_contributionIdLabel")}
              </dt>
              <dd className="mt-2">
                <code className="block max-w-full break-all rounded-md bg-muted/80 px-1.5 py-1 font-mono text-sm text-foreground">
                  {item.id}
                </code>
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                {t("detail_draftFictionId")}
              </dt>
              <dd className="mt-2">
                <code className="block max-w-full break-all rounded-md bg-muted/80 px-1.5 py-1 font-mono text-sm text-foreground">
                  {item.entityId}
                </code>
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">{t("fieldState")}</dt>
              <dd className="mt-2">
                <span
                  className={`inline-flex w-fit rounded-md px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${statusBadgeClass(item.status)}`}
                >
                  {t(`status_${item.status}`)}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">{t("fieldModerator")}</dt>
              <dd className="mt-2 text-foreground">
                {item.status === "pending"
                  ? "—"
                  : item.moderatorId
                    ? (moderatorWho ?? `${item.moderatorId.slice(0, 8)}…`)
                    : "—"}
              </dd>
            </div>
          </dl>
        </section>
      </div>
    </div>
  )
}
