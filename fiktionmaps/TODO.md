# Fiktionmaps TODOs

## Inbox

- [ ] [map] Review map sidebar: reorder its sections and summarize the content so it does not duplicate what is already shown on the fiction/place page.

## Backlog

### SEO

- [ ] [SEO] Google Search Console: confirm `https://fiktions.com/sitemap.xml` reaches `Success` status after reprocessing (without legacy errors from the previous domain).
- [ ] [SEO] URL Inspection core: validate and request indexing for `/en/map`, `/es/map`, `/en/fictions`, `/es/fictions`, `/en/scenes`, `/es/scenes`.
- [ ] [SEO] URL Inspection fictions: continue with priority slugs (today `amelie` EN/ES was already requested) and rely on sitemap for discovery of the rest.
- [ ] [SEO] Review the `Page indexing` report in Search Console and log main causes (including redirects, excluded, discovered/crawled not indexed) with suggested actions.
- [ ] [SEO] Review `Performance` in Search Console (weekly baseline: queries, pages, CTR, average position) and track `amelie` EN/ES evolution.
- [ ] [SEO] Review `Enhancements` / rich results and validate structured data on fiction pages.
- [ ] [SEO] Convert findings into a prioritized `P0/P1/P2` backlog with owner and ETA.

### Places, slugs & naming (pendiente)

- [ ] **[places] G1 — Docs**: update `docs/places-locations-design.md` (`places.name`, `places.slug`, place vs location semantics).
- [ ] **[places] G2 — Future**: scene slugs (keep `sceneId` in URL for now).
- [ ] **[places] QA**: manual pass after applying migration `043` locally/prod.

### Other product / tech

- [ ] **People model for fictions**: replace `author` TEXT column with a normalized `persons` table + `fiction_persons` junction table (fields: `fiction_id`, `person_id`, `role`). Roles: `author`, `director`, `actor`, `screenwriter`, `producer`, etc. One person can have multiple roles across multiple fictions (e.g. Clint Eastwood as actor + director). Phases: (1) DB migration + backfill existing `author` text, (2) domain/infra layer update (entity, repo, actions), (3) UI update (person search/select in create + edit forms).

- [x] Edit Place: replacing the existing image does not work.

- [ ] **Place likes (persisted)**: Fiction likes are backed by `fiction_likes`, use cases, and server actions. Place hearts in `fiction-detail.tsx` (`likedPlaces` / `togglePlaceLike`) and `PlaceDetailLikeCluster` in `fiction-place-detail-view.tsx` are client-only (no DB). Add a `place_likes`-style table + RLS, domain/repo/application/`infrastructure/next` wiring (same architectural rules as `fiction-likes`), SSR counts and per-user liked state, then replace the placeholder UI.

- [ ] User avatar upload: store file in Supabase Storage (dedicated bucket/path per user), save public URL (or storage path) in `profiles.avatar_url`; optional cleanup of previous object on change. Keep DiceBear URLs as alternative or migrate only uploads to Storage.

- [ ] Clean up place storage assets when deleting a fiction: add `deleteAssetsByFictionId` to `PlacesRepositoryPort` + Supabase impl; extend `deleteFictionUseCase` to call it before `fictionsRepo.delete` (DB `ON DELETE CASCADE` already removes `places` / `scenes` rows; Supabase Storage files for those places stay orphaned without this).

- [ ] Scenes module performance V1 (no DB changes, no video re-encoding): set `<video preload="metadata">` in viewers, enforce `poster` usage, improve loading UX states, remove waterfall/N+1 in `fiction-scene-client` with a single aggregated read action/query, and add short `unstable_cache` + invalidation for scene detail reads.

- [ ] Scenes module full optimization: build a dedicated scene-watch payload use case + optimized repository query (scenes + places/locations in one read), add viewer prefetch/observability (TTFF, buffering, bytes), and prepare optional automatic upload optimization pipeline for short clips (15s max) as a future phase.

### Cleanup, arquitectura & performance (2026-07)

> Iniciativa de limpieza. Ejecutar **de a un ticket por vez** y validar con `knip` (deps/exports/archivos muertos) + `npx tsc --noEmit` + build antes de cerrar cada uno. Los AI providers (Claude + OpenAI) SE CONSERVAN. Baseline de tipos al iniciar: 9 errores (`npx tsc --noEmit`).

#### Fase 0 — Red de seguridad
- [x] **[CLN-0] Herramientas de verificación**: `knip` agregado como devDependency + script `lint:dead`. Baseline: 56 archivos sin usar, 30 deps sin usar, 145 exports + 141 tipos sin usar, 5 exports duplicados. `npx tsc --noEmit` = 9 errores de tipos (deuda oculta por `ignoreBuildErrors`). Falsos positivos de knip a cuidar: `@types/google.maps` y `autoprefixer` sí se usan.

#### Fase 1 — Dependencias muertas (bajo riesgo, alto impacto)
- [x] **[CLN-1] Remover `cesium`**: eliminado de `package.json` (0 usos en código, confirmado por grep + knip). `npm install` removió 36 paquetes. Validado: tsc sigue en 9 errores (sin regresión) + `npm run build` OK.
- [x] **[CLN-2] Sacar `eslint-report.json` del repo**: agregado a `.gitignore` y removido del índice con `git rm --cached`. El archivo local puede quedar; ya no se versiona.

#### Fase 2 — Podar UI shadcn no usado
- [x] **[CLN-3] Borrar componentes `components/ui/*` sin referencias**: eliminados 34 archivos sin imports externos (accordion, alert, aspect-ratio, calendar, card, carousel, chart, checkbox, collapsible, command, context-menu, drawer, form, hover-card, input-otp, menubar, navigation-menu, pagination, progress, radio-group, resizable, search-input, separator, sheet, sidebar, sonner, switch, table, tabs, toaster, toggle, toggle-group, tooltip, `use-toast.ts` duplicado). Conservados `toast.tsx` + `hooks/use-toast.ts` (usados por `contribution-review-actions`). Validado: `tsc` 9→8 errores, build OK, knip unused files 56→22.
- [x] **[CLN-4] Quitar `@radix-ui/*` huérfanos**: desinstalados 29 paquetes (16 radix + `cmdk`, `recharts`, `vaul`, `sonner`, `embla-carousel-react`, `react-day-picker`, `input-otp`, `react-resizable-panels`, `react-hook-form`, `@hookform/resolvers`, `date-fns`, `next-themes`, `autoprefixer`). Conservados 11 radix en uso + `@types/google.maps` (falso positivo de knip; usado en Google Maps). `npm uninstall` removió 92 paquetes del árbol. Validado: `tsc` 8 errores (sin regresión), build OK, knip deps sin usar: 0 (solo `@types/google.maps` como falso positivo).
- [x] **[CLN-5] Consolidar sistema de toasts**: un solo stack shadcn (`hooks/use-toast.ts` + `toast.tsx` + `toaster.tsx`). Eliminados `sonner` y el `use-toast.ts` duplicado en CLN-3/CLN-4. Recreado `toaster.tsx` y montado `<Toaster />` en `app/[locale]/layout.tsx` (único consumidor: `contribution-review-actions`). Validado: sin refs a sonner/duplicado, `tsc` 8 errores (sin regresión), build OK. Pendiente validación manual en `/contributions` al aprobar/rechazar.

#### Fase 3 — Duplicaciones de mapa
- [x] **[CLN-6] Unificar marcadores (sin perder settings)**: carpetas `v1/`/`v2/` renombradas a `square/`/`round/`; exports `PlaceMarker2dSquare`/`Round`, `ClusterMarker2dSquare`/`Round`. Opciones de Settings (`marker2dShape` square|round, labels, hover, 3D) intactas. Eliminado shim `motion.ts` (fix error tsc). Validado: build OK, tsc 8→7.

#### Fase 4 — Coherencia de arquitectura
- [x] **[CLN-7] Migrar `users` a la regla de arquitectura**: `getProfilesPageCached` movido de `supabase.from` directo en `user.queries.ts` a `getProfilesPageUseCase` + `UsersRepositoryPort.listProfilesPage` en repo impl. Sin `supabase.from` de tablas de negocio en `infrastructure/next/users`.
- [x] **[CLN-8] Unificar documentación de arquitectura**: reescritos `src/README.md` y `docs/architecture-modules.md` (eliminada referencia obsoleta a `lib/server`, `*.services.ts`, `*.repository.port.ts`). Alineados con `.cursor/rules/fiktionmaps-architecture.mdc`.

#### Fase 5 — Performance de runtime
- [x] **[CLN-9] Activar optimización de imágenes**: `images.unoptimized` removido de `next.config.ts` (Next Image + `sharp` activos). `priority` + `sizes` en heroes de fiction-detail, fiction-place-detail y city-detail. `unoptimized` solo en blobs/previews (wizards, admin upload). Admin/checkins: quitado `unoptimized` innecesario en URLs remotas.
- [x] **[CLN-10] Reducir `"use client"` en `app/[locale]/(app)/layout.tsx`**: providers y lógica de pathname movidos a `components/layout/app-shell.tsx` (client). Layout queda server component delgado.
- [x] **[CLN-11] Reactivar chequeo de tipos en build**: corregidos 7 errores (`contributions/page` locale en redirect, hunt duplicate banner props, scrollRef nullable, `findDuplicate` image, contribution repo cast). `typescript.ignoreBuildErrors: false`. Validado: `tsc` 0 errores + `npm run build` OK.

#### Fase 6 — Componentes / UI muertos (sin tocar use cases)
- [x] **[CLN-12] Podar componentes UI sin referencias**: eliminados 13 archivos (`contribute-fab`, `contribute-navigation`, `hunt-source-*` ×3, `fiction-landing-v2-reference`, `recent-fictions-sidebar`, `page-hero`, `page-sticky-bar`, `theme-toggle`, `location-card`, `location-detail-panel`, `thumbnail-carousel`). Limpiado import comentado en `map/page.tsx`. Use cases en `src/` conservados a propósito. Validado: `tsc` 0, build OK, knip unused files 22→9.

## In progress

- [ ] [map] Optimize `getByBboxAndFictionIds` to avoid serial `locations -> places` queries (single joined bbox query), then measure map first-pins latency again.
- [ ] [map] General map behavior: keep `/map` default initial state as `city + all fictions`, and optimize first-pins load / entry latency.
- [ ] [map] Explore Map entry behavior: from `fictions/[slug]`, pass `city + fiction` in URL as contextual preselection (user can switch back to all fictions during navigation).
- [ ] [map] Temporary scope decision: `Visit` opens Google Maps (external link) and we defer in-map place deep-link/zoom/sidebar while prioritizing other work.

## Done (recent)

### Places, slugs & naming + fiction URL hardening (May 2026)

- [x] Migration `043_places_name_slug_fiction_slug.sql` (`places.name` NOT NULL, `places.slug`, `fictions.slug` NOT NULL)
- [x] A1 `places.name` NOT NULL + domain `name: string`
- [x] A2 `places.slug` per fiction + `place-slug.ts` + create use case
- [x] A4 Slug sin ASCII → fallback UUID
- [x] C1 URLs públicas: slug o UUID legacy (sin 301)
- [x] C2 `publicFictionPlacePath` y callers
- [x] C3 Sitemap de lugares activos
- [x] C4 Deep links del mapa documentados
- [x] D1 UI pública solo `place.name`
- [x] D2 Prop `place` en `FictionPlaceDetailView`
- [x] D3 i18n `unnamedPlace`
- [x] D4 Admin sin prefill `placeName` desde `location.name`
- [x] E1 Wizard 8 pasos (ubicación vs lugar)
- [x] E2 Mapbox solo placeholder
- [x] E3 Validación flexible + submit con `placeName`
- [x] F i18n wizard (en + es)
- [x] B1 Rutas ficción solo slug
- [x] B2 Enlaces sin `fiction.id` en URL
- [x] B3 `resolvePublicFictionFromSlugAction`
- [x] A3-lite `fictions.slug` obligatorio en tipos/create

### Earlier

- [x] Implement Places/Locations DB schema and migrations
- [x] Implement Places/Locations repositories and admin actions
- [x] Replace hard-coded map data with Places/Locations + bounds-based filtering
- [x] Replace hard-coded admin data with Places/Locations
- [x] Implement map filtering by selected fiction(s) and city
- [x] Fiction slugs in DB and `/fictions/{slug}` routes

## Related docs

- [ ] Update `docs/places-locations-design.md` (see Places G1)
- [ ] Image loading optimization — see `docs/plan-image-loading-optimization.md`
