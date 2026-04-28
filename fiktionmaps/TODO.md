# Fiktionmaps TODOs

## Inbox

## Backlog

- [ ] [SEO] Google Search Console: confirm `https://fiktions.com/sitemap.xml` reaches `Success` status after reprocessing (without legacy errors from the previous domain).

- [ ] [SEO] URL Inspection core: validate and request indexing for `/en/map`, `/es/map`, `/en/fictions`, `/es/fictions`, `/en/scenes`, `/es/scenes`.

- [ ] [SEO] URL Inspection fictions: continue with priority slugs (today `amelie` EN/ES was already requested) and rely on sitemap for discovery of the rest.

- [ ] [SEO] Review the `Page indexing` report in Search Console and log main causes (including redirects, excluded, discovered/crawled not indexed) with suggested actions.

- [ ] [SEO] Review `Performance` in Search Console (weekly baseline: queries, pages, CTR, average position) and track `amelie` EN/ES evolution.

- [ ] [SEO] Review `Enhancements` / rich results and validate structured data on fiction pages.

- [ ] [SEO] Convert findings into a prioritized `P0/P1/P2` backlog with owner and ETA.

- [ ] **People model for fictions**: replace `author` TEXT column with a normalized `persons` table + `fiction_persons` junction table (fields: `fiction_id`, `person_id`, `role`). Roles: `author`, `director`, `actor`, `screenwriter`, `producer`, etc. One person can have multiple roles across multiple fictions (e.g. Clint Eastwood as actor + director). Phases: (1) DB migration + backfill existing `author` text, (2) domain/infra layer update (entity, repo, actions), (3) UI update (person search/select in create + edit forms).

- [ ] Edit Place: replacing the existing image does not work.

- [ ] **Separate place display name from real location name**: add `places.name` (fiction/display name) while keeping `locations.name` as the real-world name. Include DB migration with backfill (`places.name <- locations.name`), update Supabase types/repositories/actions, stop overwriting `locations.name` from place edit flow, and update admin/map UI to use `places.name` as primary label (optionally show real name as secondary).

- [ ] User avatar upload: store file in Supabase Storage (dedicated bucket/path per user), save public URL (or storage path) in `profiles.avatar_url`; optional cleanup of previous object on change. Keep DiceBear URLs as alternative or migrate only uploads to Storage.

- [ ] Clean up place storage assets when deleting a fiction: add `deleteAssetsByFictionId` to `PlacesRepositoryPort` + Supabase impl; extend `deleteFictionUseCase` to call it before `fictionsRepo.delete` (DB `ON DELETE CASCADE` already removes `places` / `scenes` rows; Supabase Storage files for those places stay orphaned without this).

- [ ] Scenes module performance V1 (no DB changes, no video re-encoding): set `<video preload="metadata">` in viewers, enforce `poster` usage, improve loading UX states, remove waterfall/N+1 in `fiction-scene-client` with a single aggregated read action/query, and add short `unstable_cache` + invalidation for scene detail reads.

- [ ] Scenes module full optimization: build a dedicated scene-watch payload use case + optimized repository query (scenes + places/locations in one read), add viewer prefetch/observability (TTFF, buffering, bytes), and prepare optional automatic upload optimization pipeline for short clips (15s max) as a future phase.

## In progress

- [ ] [map] Optimize `getByBboxAndFictionIds` to avoid serial `locations -> places` queries (single joined bbox query), then measure map first-pins latency again.
- [ ] [map] General map behavior: keep `/map` default initial state as `city + all fictions`, and optimize first-pins load / entry latency.
- [ ] [map] Explore Map entry behavior: from `fictions/[slug]`, pass `city + fiction` in URL as contextual preselection (user can switch back to all fictions during navigation).
- [ ] [map] Temporary scope decision: `Visit` opens Google Maps (external link) and we defer in-map place deep-link/zoom/sidebar while prioritizing other work.

## Done (recent)

- [x] Implement Places/Locations DB schema and migrations
- [x] Implement Places/Locations repositories and admin actions
- [x] Replace hard-coded map data with Places/Locations + bounds-based filtering
- [x] Replace hard-coded admin data with Places/Locations
- [x] Implement map filtering by selected fiction(s) and city

## Related docs

- [ ] Places & Locations design (to be created)
- [ ] Image loading optimization — see `docs/plan-image-loading-optimization.md`
