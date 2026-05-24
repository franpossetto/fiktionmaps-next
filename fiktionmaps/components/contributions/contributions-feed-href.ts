/** Matches staff feed tabs in URL (`status` query). */
export type ContributionsFeedTab = "all" | "pending" | "approved"

export function buildContributionsFeedHref(tab: ContributionsFeedTab, submitter: string, page?: number): string {
  const params = new URLSearchParams()
  const sub = submitter.trim()
  if (sub) params.set("submitter", sub)
  if (tab !== "all") params.set("status", tab)
  if (page != null && page > 1) params.set("page", String(page))
  const qs = params.toString()
  return qs ? `/contributions?${qs}` : "/contributions"
}
