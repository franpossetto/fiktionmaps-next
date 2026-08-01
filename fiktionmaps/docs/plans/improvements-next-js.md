# Mejoras mapa + fiction / place / scene

Foco: usabilidad y performance. Orden por prioridad.
Medición: Chrome Incognito, Fast 4G, mismas URLs siempre; Lighthouse ×3 (promedio); HAR Network.

**Baseline Network (antes, cold `/map?city=…`):**
- Captura 1: 3× `getPlacesInBbox` + 2× `findOrCreateCity` + 2× Mapbox reverse
- Captura 2: ~8× POST `map?city=…` (DevTools muestra initiator `auth.actions.ts` para **todas** las server actions; mirar **Size** distinto = actions distintas)

| # | Status | Pri | Mejora | Área | Cómo medir (antes → después) |
|---|--------|-----|--------|------|------------------------------|
| 1 | **DONE** | P0 | Viewport del mapa filtra desde cache de ciudad (sin `getPlacesInBbox` en pan/filtro) | Mapa perf | Network: #`getPlacesInBboxAction` en load/pan → **0**. Meta: eliminar las 3 calls del baseline. |
| 2 | **DONE** | P0 | GeoProvider: ref fresca + lock inflight (no double reverse/`findOrCreateCity`) | Mapa perf | Network: #`findOrCreateCityAction` + Mapbox reverse en load → **≤1**. Meta: eliminar el doble del baseline. |
| 3 | **DONE** | P0 | Seed places+fictions+cities desde RSC; auth bootstrap 1 round-trip; geo defer 1.5s | Mapa perf | #POST server-action al boot (Size distintos): antes ~8 → **≤3** (session + geo diferido + city switch). Pins sin fetch post-hydrate. |
| 4 | **DONE** | P0 | Batch `LocationDetail` → `getMapLocationPanelAction` (1 use case, uuid check) | Mapa perf/UX | Requests al abrir sidebar → **1**. Timing `sidebar_open` → content ready. Meta: −50%. |
| 5 | **DONE** | P0 | Place→mapa con `openSidebar=1`; `?place=` UUID abre sidebar (+ cityPlaces fallback) | Mapa UX | 5 flujos place→map: panel abierto en 1 click = 100%. |
| 6 | **DONE** | P0 | Pins: `loadPlaceAvatarThumbs` (xs→sm) en city/fiction lists; sin backfill client | Mapa perf | #`ensureAssetImageXs` post-load → **0**. Sin re-render de markers. |
| 26 | **DONE** | P0 | Sidebar: hero no upscale xs (LQIP blur→lg); skeleton contributors; prefetch panel al click | Mapa UX/perf | Al abrir pin: hero nítido &lt;300ms percibido; byline sin “pop” vacío. Causado por #6 (pin=xs). |
| 7 | **DONE** | P0 | Cache `getSceneById` / `getScenesForFiction` / city-video scenes | Scene | TTFB página scene (cold/warm). Meta: warm ≈ instant; cold −30%. |
| 8 | **DONE** | P0 | Batch related places (`getPlaceLocationsByIdsCached`) | Scene | #queries place relacionadas → 1. |
| 9 | **DONE** | P0 | Stream/defer recommendations (`Suspense` + async RSC) | Fiction | LCP no espera recs; recs miden aparte. |
| 10 | **DONE** | P0 | Search mobile: botón 🔍 → dialog full-screen con `MapFictionCitySearch` | Mapa UX | Ver “Objetivo + testing #10” abajo. |
| 11 | pending | P1 | Shell mapa + skeleton (no spinner fullscreen) | Mapa UX | Time-to-first-map-chrome &lt;1s (4G Fast). |
| 12 | **DONE** | P1 | Diferir 2º Mapbox: idle + canvas lazy solo si minimap visible | Mapa perf | Al boot: 1 instancia GL; 2ª solo al mostrar minimap. `isHuntAvailable` lazy al abrir menú. |
| 13 | pending | P1 | Evitar remount `MapClusterLayer` en toggles 3D/shape | Mapa perf | FPS al toggle; sin reload de clusters. |
| 14 | pending | P1 | Primera ciudad: geo / última usada vs random | Mapa UX | % ciudad inicial relevante (geo o last). |
| 15 | **DONE** | P1 | Fiction: `FictionDetail` RSC; likes/tracker islas client; `initialLiked` SSR | Fiction | LCP hero en HTML; JS solo likes. |
| 16 | pending | P1 | Place: cache `getScenesForPlace` + parallel resolve | Place | TTFB −25%. |
| 17 | pending | P1 | Place like: cablear o ocultar stub | Place UX | Like no-op → 0 en QA. |
| 18 | **DONE** | P1 | Scene: `getSceneWatchBundleUseCase` (critical path) | Scene | 1 composition fetch; TTFB. |
| 19 | pending | P1 | Reducir `"use client"` en detail shells | Shared | Bundle analyzer / First Load JS −10–20%. |
| 20 | pending | P1 | Alinear `unstable_cache` scenes/map-places al nivel fiction | Shared | p95 warm cache ≈ fiction. |
| 21 | pending | P2 | Loading skeletons alineados (fiction/place) | UX | CLS &lt;0.1. |
| 22 | pending | P2 | Video scene: poster/progressive loading | Scene UX | Poster visible &lt;500ms. |
| 23 | **DONE** | P2 | Stream `SceneUpNextDeferred` (Suspense) aparte del watch | Scene | Watch view no bloqueado por aside. |
| 24 | pending | P2 | Prefetch city map on hover “Explore map” | Shared | place→map pins ready −30% vs cold. |
| 25 | pending | P2 | Unificar pin round/square si ambos cargan | Mapa perf | 1 sistema de pins en bundle. |

---

## Protocolo de presentación

| Campo | Valor |
|-------|--------|
| Rutas fijas | `/map`, 1 fiction, 1 place, 1 scene |
| Condiciones | Incognito, Fast 4G, cold + warm |
| Tools | Network HAR, Lighthouse Mobile ×3, (ideal) Speed Insights 7d |
| Tabla demo | Mejora · Métrica · Antes · Después · Δ% |

### Ya medible (post #1–#5, #12)

| Mejora | Métrica | Antes (baseline) | Después esperado |
|--------|---------|------------------|------------------|
| #1 Bbox client | `getPlacesInBboxAction` en load | 3 | 0 |
| #2 Geo dedupe | `findOrCreateCityAction` en load | 2 | ≤1 (tras defer ~1.5s) |
| #2 Geo dedupe | Mapbox reverse geocode en load | 2 | ≤1 |
| #3 RSC seed | POST `map?city` server actions al boot | ~8 | ≤2–3 (session; geo luego) |
| #3 RSC seed | `getCityPlaces` / `getCityFictions` / `getAllCities` client | sí | 0 en first paint |
| #4 Sidebar batch | POSTs al abrir panel | 3–4 | 1 |
| #5 Round-trip | place→map abre panel | no | sí |
| #12 Minimap | 2º Mapbox al boot | sí | no (idle + visible) |
| Hunt menu | `isHuntAvailable` al load mapa | sí | solo al abrir menú |
| #6 Pin xs | `ensureAssetImageXs` post-load | N places | 0 |
| #26 Sidebar | hero borroso / contributor tarde | xs upscaled + byline null | LQIP+skeleton+prefetch |

---

### Objetivo + testing #10 (search mobile)

**Objetivo:** En viewport &lt; `md`, el usuario puede buscar ficción/ciudad/lugar sin usar solo CitySelector. Antes el search estaba `hidden md:block`.

**Cómo probar:**
1. Chrome DevTools → iPhone / width 390px → `/map`
2. Debe verse un botón 🔍 a la derecha (junto a 3D / ciudad)
3. Tap → dialog a pantalla completa con el mismo search que desktop
4. Buscar una ficción conocida → elegir hit → dialog cierra, mapa filtra/cambia ciudad
5. Buscar una ciudad → mismo flujo
6. En `md+` el botón 🔍 no aparece; la barra central sigue igual

**Criterio done:** task “encontrar ficción X en mobile” en ≤3 taps desde el mapa.

---

## Orden de ataque restante

1. #11 skeleton mapa / #13 cluster remount  
2. Resto P1/P2  
