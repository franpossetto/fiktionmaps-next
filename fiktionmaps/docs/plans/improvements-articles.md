# Mejoras articles: Fiction / Place / Scene

Foco: performance, calidad y seguridad de las rutas “artículo” (detalle público).
Orden por prioridad.

Relacionado (mapa): `improvements-next-js.md`.

---

## Cómo medimos el impacto (cada mejora)

El **agente** cierra cada ítem con un log en [Log de mediciones](#log-de-mediciones): evidencia de código (antes/después del data path). No se pide al usuario completar HAR/Lighthouse.

| Tipo | Evidencia que cuenta |
|------|----------------------|
| Perf GET | Qué queries salían del critical path → cuáles quedan / cache / Suspense |
| Calidad | Filtro/redirect/404 esperado |
| Seguridad | RLS + guard en action |

Rutas de referencia: `FICTION` `/en/fictions/amelie` · `PLACE` `/en/fictions/john-wick/places/continental-hotel` · `SCENE` `.../scenes/<uuid>`.
---

## Baseline actual (resumen)

| Ruta | RSC page | Cache | Bloqueo principal | Client boundary |
|------|----------|-------|-------------------|-----------------|
| Fiction | `fictions/[slug]/page.tsx` | places approved + cities from places; like client | Recs en Suspense | `FictionDetail` `"use client"` |
| Place | `.../places/[placeId]/page.tsx` | place + scenes cached; city by id | Fiction→place (necesita fiction.id) | `FictionPlaceDetailView` + Mapbox |
| Scene | `.../scenes/[sceneId]/page.tsx` | scene/list cached anon | Related places batched | Video autoplay |

---

## Tabla de mejoras (nombres cortos)

| # | Codename | Status | Pri | Qué | Área | Métrica primaria | Meta |
|---|----------|--------|-----|-----|------|------------------|------|
| 1 | **SceneGuard** | **DONE** | P0 | RLS + guards en `update`/`delete` scene (y places/fictions análogos) | Seguridad | Auth user no-staff: DELETE/UPDATE scene | denegado (action + PostgREST) |
| 2 | **SceneCache** | **DONE** | P0 | Anon + `unstable_cache` para `getSceneById` / scenes-by-fiction / by-place | Scene perf | TTFB `SCENE` warm (Network Doc) | ≈ cache hit; cold −30% |
| 3 | **PlaceBatch** | **DONE** | P0 | Related places en 1 query (`getByIds`), no N× `getById` | Scene perf | #fetches place en load `SCENE` | **1** |
| 4 | **RecsDefer** | **DONE** | P0 | Suspense: recommendations fuera del critical path | Fiction perf | LCP `FICTION` vs tiempo slot recs | LCP no espera recs |
| 5 | **ApprovedPlaces** | **DONE** | P0 | Fiction list usa `listApprovedByFictionId` / active+approved | Fiction calidad | Place inactive/pending en lista | **0** visibles |
| 6 | **ActiveOnly** | partial | P1 | Place público: active+approved en resolve (scene TBD) | Calidad | URL place inactiva | **404** |
| 7 | **AnonReads** | pending | P1 | Lecturas públicas siempre anon (no cookie) | Seguridad | Pending visible en page pública (sesión staff) | **no** |
| 8 | **LikeIsland** | **DONE** | P1 | Like user fuera del SSR crítico; hydrate client | Fiction perf | Cookie `getUser`+all likes en SSR fiction | **0** en critical path |
| 9 | **PlacesOnce** | **DONE** | P1 | Cities desde places + `getAllCitiesCached` (sin 2º places fetch) | Fiction perf | #places list fetch en `FICTION` | **1** |
| 10 | **CityIdsBatch** | **DONE** | P1 | Recs: `Promise.all` fiction-ids-by-city | Fiction perf | Latency server recs same_city | parallel vs sequential |
| 11 | **WatchCompose** | pending | P1 | Use case único watch (scene composition) | Scene arch | #use cases / round-trips orquestados en page | **1** composition |
| 12 | **PlaceScenesCache** | **DONE** | P1 | Scenes-for-place cached + city via `getCityByIdCached` (no all fiction cities) | Place perf | GETs city en `PLACE` | 1 city id, no fan-out fiction cities |
| 13 | **PlaceLikeReal** | **DONE** | P1 | Ocultar like stub de place (no persistía) | Place UX | Likes no-op en QA | **0** |
| 26 | **PlaceFast** | **DONE** | P0 | PLACE critical path: solo fiction→place→city; scenes/contributors Suspense; Mapbox lazy viewport | Place perf | GETs bloqueantes en PLACE Doc | city+sidebar only; scenes/contrib stream |
| 14 | **RscShell** | pending | P1 | Hero/copy RSC; client solo islas | Bundle | First Load JS `FICTION`/`PLACE` | −15–20%; LCP −20% |
| 15 | **SlugRedirect** | pending | P1 | UUID place → 308 slug | Place SEO | Status UUID URL | **308** → slug |
| 16 | **SceneSEO** | pending | P1 | Sitemap scenes + JSON-LD place/scene | SEO | Scene en `/sitemap.xml` + rich-results | presente / sin error |
| 17 | **SceneUuidGate** | pending | P1 | Validar UUID en page antes del DB | Scene calidad | ID basura: #queries DB | **0** (404 local) |
| 18 | **VideoPoster** | pending | P2 | Poster + thumbs sin video metadata preload | Scene UX | Tiempo a poster visible; #`<video>` en up-next | poster &lt;500ms |
| 19 | **UpNextStream** | pending | P2 | Suspense en `SceneUpNextAside` | Scene perf | Paint watch chrome vs aside ready | chrome **antes** |
| 20 | **SkeletonFit** | pending | P2 | Loading = layout real (no spinner) | UX | CLS Lighthouse `FICTION`/`PLACE` | **&lt;0.1** |
| 21 | **TopStatic** | pending | P2 | `generateStaticParams` / ISR top-N | Shared perf | TTFB cold top fiction | ≈ warm |
| 22 | **LeanMapper** | pending | P2 | No filtrar `select("*")` al client | Higiene | Props client incluyen `status`/cols internas | **no** |
| 23 | **A11yI18n** | pending | P2 | Play/Mute + not-found localizados | Calidad | ES/EN strings | 100% keys |
| 24 | **HoverPrefetch** | pending | P2 | Prefetch place/scene al hover | UX | Nav place/scene percibida vs cold | −30% |
| 25 | **CityScenesCache** | pending | P2 | Cache completo de `getScenesForCityCached` | Scene perf | Warm aside city: cache keys / TTFB | 1 key estable |

---

## Orden de ataque (restante)

1. Scene **ActiveOnly** / **WatchCompose** si priorizás watch  
2. **RscShell** (menos JS en place/fiction detail)  
3. SEO P2 (SlugRedirect, SceneSEO)  

---

## Detalle rápido (por codename)

### SceneGuard
RLS `022_scenes_rls.sql` + `updateSceneAction` / `deleteSceneAction` sin check de rol. Mismo patrón en places/fictions si aún están abiertos.

### SceneCache / PlaceBatch
Hoy: `getSceneByIdUncached`, `getScenesForFiction` sin cache; `loadRelatedPlaces` N+1. Fix: anon adapter + cache tags; batch `getByIds`.

### RecsDefer
`getFictionDetailRecommendations` corre tras el `Promise.all` y bloquea HTML. Slot `Suspense` + skeleton.

### ApprovedPlaces
`getFictionPlacesUseCase` → `getByFictionId`. Debe usar approved/active.

---

## Archivos ancla

| Concern | Path |
|---------|------|
| Fiction page | `app/[locale]/(app)/fictions/[slug]/page.tsx` |
| Place page | `app/[locale]/(app)/fictions/[slug]/places/[placeId]/page.tsx` |
| Scene page | `app/[locale]/(app)/fictions/[slug]/scenes/[sceneId]/page.tsx` |
| Scene queries | `src/scenes/infrastructure/next/scene.queries.ts` |
| Scene actions | `src/scenes/infrastructure/next/scene.actions.ts` |
| Scene RLS | `supabase/migrations/022_scenes_rls.sql` |
| Fiction places UC | `src/places/application/get-fiction-places.usecase.ts` |
| Recs UC | `src/fictions/application/get-fiction-detail-recommendations.usecase.ts` |
| Sitemap | `app/sitemap.ts` |

---

## Log de mediciones

> Cada mejora cerrada agrega un bloque con la plantilla de arriba.
> Baseline global opcional (una vez): rellenar TTFB/LCP cold+warm de FICTION / PLACE / SCENE antes del primer P0.

### A01 SceneGuard — 2026-07-18

- Ruta: n/a (seguridad; afecta SCENE/PLACE/FICTION content integrity)
- Cold/Warm: n/a
- Métrica primaria: Auth user no-staff DELETE/UPDATE scene (action + PostgREST)
- Antes: FAIL — `updateSceneAction`/`deleteSceneAction` solo `auth.getUser()`; RLS `USING (true)` en scenes/places/locations/fictions UPDATE/DELETE; fiction/place update/delete sin auth
- Después: PASS (código)
  - Actions: staff check vía `ensureUserIsModeratorUseCase` en update/delete scene, place, fiction (+ `setFictionActiveAction`)
  - RLS: migración `057_entity_update_delete_staff_rls.sql` → policies `is_staff_profile()` 
- Δ%: n/a (checklist)
- Notas: aplicar migración en Supabase antes de prod. INSERT contributor (pending) no cambia. QA manual post-migrate: user role=`user` → action returns Unauthorized; PostgREST update/delete → 401/0 rows; staff admin → OK.
- Veredicto: PASS (código); confirmar QA tras `supabase db push` / migrate

### A02 SceneCache — 2026-07-18

- Ruta: SCENE (+ PLACE scenes list)
- Métrica: cache en critical GET
- Antes: `getSceneByIdUncached` + lists sin `unstable_cache`
- Después: `getSceneByIdCached` / `getScenesForFictionCached` / `getScenesForPlaceCached` (anon + medium cache)
- Veredicto: PASS

### A03 PlaceBatch — 2026-07-18

- Ruta: SCENE
- Antes: N× `getPlaceLocationByIdCached`
- Después: 1× `getPlaceLocationsByIdsCached` / `getByIds`
- Veredicto: PASS

### A04 RecsDefer — 2026-07-18

- Ruta: FICTION
- Antes: `await getFictionDetailRecommendations` + place counts bloqueaban el HTML del article
- Después: `<Suspense>` + `FictionDetailRecommendations` RSC; shell/places pintan sin esperar recs
- Veredicto: PASS

### A05 ApprovedPlaces — 2026-07-18

- Ruta: FICTION
- Antes: `getFictionPlacesUseCase` → `getByFictionId`
- Después: `listApprovedByFictionId`; cache key `places:…:approved`
- Veredicto: PASS

### A08 LikeIsland — 2026-07-18

- Ruta: FICTION
- Antes: `getCurrentUserHasLikedFiction` en `Promise.all` (cookie + todos los liked ids)
- Después: SSR `initialLiked=false`; hydrate con `getMyLikedFictionIdsAction` post-auth
- Veredicto: PASS

### A09 PlacesOnce — 2026-07-18

- Ruta: FICTION
- Antes: `getFictionPlacesCached` + `getFictionCitiesCached` (2º `getByFictionId` interno)
- Después: places ×1 + `getAllCitiesCached` filtrado por cityIds de places
- Veredicto: PASS

### A10 CityIdsBatch — 2026-07-18

- Ruta: FICTION (recs deferred)
- Antes: loop secuencial `getFictionIdsByCityId`
- Después: `Promise.all` por cityIds
- Veredicto: PASS

### A12 PlaceScenesCache — 2026-07-18

- Ruta: PLACE
- Antes: `getFictionCitiesCached` (todas cities de la fiction) + scenes uncached
- Después: `getScenesForPlaceCached` + `getCityByIdCached(place.cityId)` en paralelo con sidebar/contributors
- Veredicto: PASS

### A26 PlaceFast — 2026-07-18

- Ruta: PLACE (`/en/fictions/john-wick/places/continental-hotel`)
- Antes: critical path esperaba city + scenes + contributors + sidebar; Mapbox al mount; like stub; place inactivo resoluble
- Después:
  - Critical: fiction → place → city + sidebar
  - Scenes + contributors en `<Suspense>` (`PlaceDetailScenes` / `PlaceDetailContributors`)
  - Mapbox solo al acercarse al viewport (`IntersectionObserver`)
  - Like stub removido
  - Resolve: slug `active+approved`; UUID vía `isApprovedActivePlace`
- Veredicto: PASS
