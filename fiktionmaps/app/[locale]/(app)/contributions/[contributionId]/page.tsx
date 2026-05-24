import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { PageBreadcrumb } from "@/components/navigation/page-breadcrumb"
import { FictionContributeLayout } from "@/components/contribute/fiction/fiction-contribute-layout"
import { StaffContributionDetail } from "@/components/contributions/staff-contribution-detail"
import { StaffContributionReviewRightAside } from "@/components/contributions/staff-contribution-review-right-aside"
import { ContributionsRightRail } from "@/components/contributions/contributions-right-rail"
import {
  getContributorModerationContextForStaffSession,
  getFictionContributionDetailForStaffSession,
} from "@/src/contributions/infrastructure/next/contribution.queries"
import { getFictionByIdForStaffSession } from "@/src/fictions/infrastructure/next/fiction.queries"
import { getProfileForStaffSession } from "@/src/users/infrastructure/next/user.queries"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Contributions")
  return { title: t("metaTitleDetail") }
}

interface Props {
  params: Promise<{ contributionId: string }>
}

export default async function StaffContributionPage({ params }: Props) {
  const { contributionId } = await params
  const [tContrib, tMeta, item] = await Promise.all([
    getTranslations("Contributions"),
    getTranslations("Metadata"),
    getFictionContributionDetailForStaffSession(contributionId),
  ])
  if (!item) notFound()

  const [fiction, contributorContext, moderatorProfile] = await Promise.all([
    getFictionByIdForStaffSession(item.entityId),
    getContributorModerationContextForStaffSession(item.userId),
    item.status !== "pending" && item.moderatorId
      ? getProfileForStaffSession(item.moderatorId)
      : Promise.resolve(null),
  ])

  const moderatorWho =
    item.status !== "pending" && item.moderatorId
      ? moderatorProfile?.username?.trim()
        ? `@${moderatorProfile.username.trim()}`
        : `${item.moderatorId.slice(0, 8)}…`
      : null

  const reviewRail = (
    <StaffContributionReviewRightAside item={item} fiction={fiction} moderatorWho={moderatorWho} />
  )

  const workTitle =
    fiction?.title?.trim() || item.fictionTitle?.trim() || tContrib("feedCard_untitledFiction")

  return (
    <FictionContributeLayout
      leftAside={null}
      rightAside={<ContributionsRightRail variant="detail" reviewRail={reviewRail} />}
    >
      <div className="w-full min-w-0 px-4 pb-8 pt-0 sm:px-5">
        <div className="mb-6">
          <PageBreadcrumb
            ariaLabel={tMeta("breadcrumbNavAriaLabel")}
            className="min-w-0"
            items={[
              { label: tContrib("title"), href: "/contributions" },
              { label: workTitle },
            ]}
          />
        </div>
        <div className="border-b border-border/60 pb-8 min-[900px]:hidden">{reviewRail}</div>
        <StaffContributionDetail item={item} fiction={fiction} contributorContext={contributorContext} />
      </div>
    </FictionContributeLayout>
  )
}
