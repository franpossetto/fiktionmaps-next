import type { StaffContributionsFeedKind } from "@/src/contributions/domain/contribution.entity"

/** Matches staff feed tabs in URL (`status` query). */
export type ContributionsFeedTab = "all" | "pending" | "approved" | "rejected"

export function parseContributionsFeedKind(raw: string | undefined): StaffContributionsFeedKind {
  const s = raw?.trim().toLowerCase() ?? ""
  if (s === "place" || s === "all") return s
  return "fiction"
}

export function buildContributionsFeedHref(
  tab: ContributionsFeedTab,
  submitter: string,
  page?: number,
  kind: StaffContributionsFeedKind = "fiction",
): string {
  const params = new URLSearchParams()
  const sub = submitter.trim()
  if (sub) params.set("submitter", sub)
  if (tab !== "all") params.set("status", tab)
  if (page != null && page > 1) params.set("page", String(page))
  if (kind !== "fiction") params.set("kind", kind)
  const qs = params.toString()
  return qs ? `/contributions?${qs}` : "/contributions"
}
