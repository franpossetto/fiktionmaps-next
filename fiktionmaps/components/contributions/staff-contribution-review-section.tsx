"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { ContributionReviewActions } from "@/components/contributions/contribution-review-actions"
import { contributionTypeMessageKey } from "@/components/contributions/contribution-type-label"
import { Button } from "@/components/ui/button"
import type { ContributionType, FictionContributionFeedItem } from "@/src/contributions/domain/contribution.entity"

export interface StaffContributionReviewSectionProps {
  status: FictionContributionFeedItem["status"]
  contributionId: string
  contributionType: ContributionType
}

/** Read-only mirror of the actions row: same `Button` + `size="sm"` as `ContributionReviewActions`. */
function ResolvedReviewChoice({ status }: { status: "approved" | "rejected" }) {
  const t = useTranslations("Contributions")

  if (status === "approved") {
    return (
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          tabIndex={-1}
          className="pointer-events-none border-0 bg-teal-600 text-white hover:bg-teal-600 dark:bg-teal-500 dark:hover:bg-teal-500"
        >
          {t("staffReview_accepted")}
        </Button>
        <Button type="button" size="sm" variant="outline" disabled>
          {t("staffReview_reject")}
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" size="sm" variant="outline" disabled>
        {t("staffReview_approve")}
      </Button>
      <Button type="button" size="sm" variant="destructive" tabIndex={-1} className="pointer-events-none">
        {t("staffReview_rejected")}
      </Button>
    </div>
  )
}

export function StaffContributionReviewSection({
  status,
  contributionId,
  contributionType,
}: StaffContributionReviewSectionProps) {
  const t = useTranslations("Contributions")
  const [reviewStatus, setReviewStatus] = useState(status)

  useEffect(() => {
    setReviewStatus(status)
  }, [status])

  return (
    <section className="border-t border-border/60 py-10">
      <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-foreground">{t("sectionReview")}</h2>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{t("sectionReviewHelp")}</p>
      <p className="mt-3 text-sm text-foreground">
        <span className="text-muted-foreground">{t("fieldType")}</span>{" "}
        <span className="font-medium">{t(contributionTypeMessageKey(contributionType))}</span>
      </p>

      <div className="mt-6">
        {reviewStatus === "pending" ? (
          <ContributionReviewActions
            contributionId={contributionId}
            onResolved={(next) => setReviewStatus(next)}
          />
        ) : (
          <ResolvedReviewChoice status={reviewStatus} />
        )}
      </div>
    </section>
  )
}
