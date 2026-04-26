# Google Search Console Bootstrap

## Scope
Operational checklist to activate and validate indexation for `fiktions.com`.

## 1) Properties
- Ensure URL-prefix property exists for `https://fiktions.com/`.
- Optionally keep alternate host property only for redirect monitoring.

## 2) Verification
- Preferred: DNS verification at domain level.
- Alternative: set `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` and deploy to publish the verification meta tag.

## 3) Sitemap Submission
- Submit `https://fiktions.com/sitemap.xml`.
- Confirm status is `Success`.
- Re-submit after major URL expansions.

## 4) First Index Requests
Request indexing for:
- `/en/fictions`
- `/es/fictions`
- Top fiction detail pages in both locales.

## 5) Coverage Review (first 14 days)
Check every 2-3 days:
- `Crawled - currently not indexed`
- `Duplicate without user-selected canonical`
- Alternate page with proper canonical

## 6) Escalation Rules
- If URLs remain unindexed after 14 days, verify content uniqueness and internal links.
- If duplicate-canonical warnings grow, re-check canonical consistency and redirect behavior.
