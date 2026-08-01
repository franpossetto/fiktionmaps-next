# SEO Baseline Audit

## Goal
Establish a repeatable indexability audit before and after SEO changes.

## Critical URLs
- `https://fiktions.com/en`
- `https://fiktions.com/es`
- `https://fiktions.com/en/fictions`
- `https://fiktions.com/es/fictions`
- `https://fiktions.com/en/map`
- `https://fiktions.com/es/map`
- `https://fiktions.com/en/scenes`
- `https://fiktions.com/es/scenes`

## Manual Checks
For each URL, validate:
- Status code is `200`.
- Canonical points to the same locale URL.
- No `noindex` on public pages.
- `hreflang` alternates contain `en` and `es`.
- Page is linked internally from at least one crawlable page.

## Private URL Checks
Validate these return noindex and are blocked in `robots`:
- `https://fiktions.com/en/login`
- `https://fiktions.com/en/onboarding`
- `https://fiktions.com/en/profile`
- `https://fiktions.com/en/settings`
- `https://fiktions.com/en/admin`

## Crawl/Render Spot Check
Run in browser devtools or external crawler:
- JS renders meaningful text content for indexable routes.
- Main navigation includes links to map/fictions/scenes.
- No redirect chain longer than one hop.

## Done Criteria
- Public URLs pass all checks.
- Private/auth/admin URLs are not indexable.
- Any failures are logged in the SEO backlog with owner and ETA.
