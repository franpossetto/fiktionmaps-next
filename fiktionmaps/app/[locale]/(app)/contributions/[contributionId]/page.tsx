import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { PageBreadcrumb } from "@/components/navigation/page-breadcrumb"
import { FictionContributeLayout } from "@/components/contribute/fiction/fiction-contribute-layout"
import { StaffContributionDetail } from "@/components/contributions/staff-contribution-detail"
import { StaffPlaceContributionDetail } from "@/components/contributions/staff-place-contribution-detail"
import { StaffContributionReviewRightAside } from "@/components/contributions/staff-contribution-review-right-aside"
import { StaffPlaceContributionReviewRightAside } from "@/components/contributions/staff-place-contribution-review-right-aside"
import { ContributionsRightRail } from "@/components/contributions/contributions-right-rail"
import {
  getContributorModerationContextForStaffSession,
  getStaffContributionDetailForStaffSession,
} from "@/src/contributions/infrastructure/next/contribution.queries"
import { isPlaceContributionFeedItem } from "@/src/contributions/domain/contribution.entity"
import { getFictionByIdForStaffSession } from "@/src/fictions/infrastructure/next/fiction.queries"
import { getPlaceLocationByIdForStaffSession } from "@/src/places/infrastructure/next/place.queries"
import { getProfileForStaffSession } from "@/src/users/infrastructure/next/user.queries"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Contributions")
  return { title: t("metaTitleDetail") }
}

interface Props {
  params: Promise<{ contributionId: string }>
}

async function resolveModeratorWho(
  item: { status: string; moderatorId: string | null },
): Promise<string | null> {
  if (item.status === "pending" || !item.moderatorId) return null
  const moderatorProfile = await getProfileForStaffSession(item.moderatorId)
  return moderatorProfile?.username?.trim()
    ? `@${moderatorProfile.username.trim()}`
    : `${item.moderatorId.slice(0, 8)}…`
}

export default async function StaffContributionPage({ params }: Props) {
  const { contributionId } = await params
  const [tContrib, tMeta, item] = await Promise.all([
    getTranslations("Contributions"),
    getTranslations("Metadata"),
    getStaffContributionDetailForStaffSession(contributionId),
  ])

  if (!item) notFound()

  if (isPlaceContributionFeedItem(item)) {
    const [place, fiction, contributorContext, moderatorWho] = await Promise.all([
      getPlaceLocationByIdForStaffSession(item.entityId),
      item.fictionId
        ? getFictionByIdForStaffSession(item.fictionId)
        : Promise.resolve(null),
      getContributorModerationContextForStaffSession(item.userId),
      resolveModeratorWho(item),
    ])

    const workTitle =
      place?.name?.trim() || item.placeName?.trim() || tContrib("feedCard_untitledPlace")

    const reviewRail = (
      <StaffPlaceContributionReviewRightAside item={item} moderatorWho={moderatorWho} />
    )

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
                { label: tContrib("title"), href: "/contributions?kind=place" },
                { label: workTitle },
              ]}
            />
          </div>
          <div className="border-b border-border/60 pb-8 min-[900px]:hidden">{reviewRail}</div>
          <StaffPlaceContributionDetail
            item={item}
            place={place}
            fiction={fiction}
            contributorContext={contributorContext}
          />
        </div>
      </FictionContributeLayout>
    )
  }

  const [fiction, contributorContext, moderatorWho] = await Promise.all([
    getFictionByIdForStaffSession(item.entityId),
    getContributorModerationContextForStaffSession(item.userId),
    resolveModeratorWho(item),
  ])

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
