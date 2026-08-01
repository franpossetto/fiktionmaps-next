# Free World — plan de performance y UX de carga

Documento de análisis + plan priorizado (sin implementación). Complementa `free-world.md`.
Fecha: 2026-07-20.

---

## 1. Síntomas reportados

| Síntoma | Qué ve el user |
|---------|----------------|
| Carga lenta al entrar a World | Mapa Mapbox listo, pero **sin pins** durante segundos |
| Mapa vacío largo rato | Sobre todo al pan/zoom o al toggle City → World |
| Pines “en cualquier lado” | Cluster lejos de la ciudad esperada, o salto al llegar datos reales |

Objetivo del plan: **time-to-first-cluster < 300–500ms** en viewport típico (cache warm o SQL indexado), y **nunca pantalla vacía** mientras hay un fetch en curso si ya había clusters.

---

## 2. Diagnóstico (estado del código hoy)

### 2.1 Cuello de botella #1 — agregación en Node, no en SQL (crítico)

Existe la RPC `map_place_clusters` (migración `059`), y el repo la llama.

Path real actual:

```
moveend → getMapClustersInBboxAction
  → listMapClustersInBboxCached
    → repo.getClustersInBbox:
        SELECT hasta 5000 places
          + join locations
          + join cities
        → bucket en JS (outlier snap, dominant city, top fictions)
        → 2 queries extra: covers xs + títulos
        → MapCluster[] con hasta 5 covers por pin
```

Efecto a zoom bajo (bbox continental/mundial):

- Payload de **miles de filas** por request (cap 5000).
- CPU en el server action + serialización.
- Segunda ola de I/O por covers/títulos.
- El mapa se siente vacío hasta que **todo** termina.

La RPC SQL solo devolvía `{id, lat, lng, count, dominant_city_id, share}` — liviana — y quedó **huérfana**.

### 2.2 Cuello de botella #2 — UX de loading (vacío prolongado)

- Al entrar a World: `setWorldClusters([])` → **borra pins al instante**.
- No hay estado `loading` / skeleton / stale-while-revalidate.
- El fetch de world **no usa** el debounce de 300ms del path city (`BOUNDS_DEBOUNCE_MS`); cada `moveend` dispara action.
- Hay cancelación por generación (`worldFetchGenRef`), bien; pero cada request cancelado ya gastó trabajo en el server.

### 2.3 Cuello de botella #3 — covers en el hot path

Cada cluster lleva hasta 5 `fictionCovers` (URL + title). Con ~50–200 clusters:

- Payload JSON grande.
- Decenas/cientos de `<img>` al pintar → red + decode en el cliente.
- Covers son nice-to-have para discovery; **no** deberían bloquear el primer paint de conteos.

### 2.4 Por qué “pines en cualquier lado”

| Causa | Mecanismo |
|-------|-----------|
| **Geocodes malos** | Place con `city_id=París` y coords en BA (documentado). Mitigación actual: snap si distancia > 2° al centro de ciudad — solo en el path JS. |
| **Centroide de grid** | A zoom bajo el pin es el promedio del bucket (o centro de ciudad si `cityCount === 1`). Puede sentirse “desplazado”. |
| **Bbox aproximado al entrar** | Toggle World usa `approxBboxFromCenter` → fetch A; luego Mapbox reporta bounds reales → fetch B. Posible flash de clusters “raros” o vacío entre A y B. |
| **Antimeridian / bbox enorme** | Split + merge de clusters; centroides ponderados pueden saltar. |
| **Cap 5000 rows** | Buckets incompletos → densidades incorrectas / pins que “faltan” o se mueven al panear. |

### 2.5 Otros factores (secundarios)

- Cache `unstable_cache` short = **60s** — ayuda en panes repetidos, no en el primer hit frío.
- URL `replace` en cada cambio de viewport world → ruido, no el main cost.
- `WORLD_Z_ENTER === WORLD_Z_EXIT === 8` — sin histéresis (riesgo bounce city↔world; no es perf directa).
- Path `listMapPlacesInBbox` sigue en el código; world actual es **aggregates only** (bien). No reintroducir places-by-bbox en world.

---

## 3. Principios de mejora

1. **Agregar en la DB, transferir DTO mínimo** — el cliente pinta conteos; covers son second paint.
2. **Stale-while-revalidate** — nunca limpiar clusters al panear; reemplazar al llegar la respuesta fresca.
3. **Prefetch + debounce** — menos round-trips; más hits de cache.
4. **Separar “estructura” de “ornamento”** — pin con badge count primero; covers lazy.
5. **Datos limpios > hacks** — corregir outliers en DB; el snap es red de seguridad.

---

## 4. Alternativas evaluadas

### A. Usar / evolucionar la RPC SQL (recomendada — núcleo)

Volver a `rpc('map_place_clusters', …)` (o versión v3) como única fuente de aggregates.

Extender SQL para lo que hoy hace Node:

- `dominant_city_id` + `city_count` (no solo share).
- Snap de outliers en SQL (`CASE WHEN hypot(...) > 2 THEN city.lat …`).
- Opcional: top-N `fiction_id` por bucket **sin** joins de media (solo IDs).

**Pros:** payload chico; escala; alinea con el diseño original.  
**Contras:** hay que portar outlier + city_count + fiction tops a SQL; covers siguen aparte.

**Impacto:** ★★★★★ latency + vacío.

### B. Tabla preagregada / materializada por zoom band

Job o trigger que mantiene `place_cluster_buckets (z_band, gy, gx, count, dominant_city_id, …)`.

**Pros:** lookups O(buckets), no O(places).  
**Contras:** infra de refresh; más lejos del stack actual.

**Impacto:** ★★★★☆ a escala grande. Fase 2/3 si el catálogo crece.

### C. Vector tiles (MVT)

**Pros:** industria, CDN.  
**Contras:** overkill hoy. Diferir.

### D. Solo optimizaciones de cliente (debounce, SWR, no clear)

Baratas y necesarias, pero **no alcanzan** si el backend sigue trayendo 5000 rows.

**Impacto:** ★★★☆☆ percepción; ★☆☆☆☆ si A no se hace.

### E. Seed RSC de overview mundial

Al entrar a `/map?mode=world`, server manda clusters del viewport inicial (o un overview fijo).

**Pros:** first paint con datos en el HTML/stream.  
**Contras:** hay que definir viewport default; no ayuda al pan.

**Impacto:** ★★★☆☆ TTI entrada; combinar con A.

### F. Cluster por ciudad a zoom muy bajo (no grid)

Overview = un pin por ciudad con `place_count` (tabla cities o `GROUP BY city_id`).

**Pros:** semántica clara (“París 120”); click → city sandbox natural; evita centroides raros.  
**Contras:** a zoom medio el grid sigue haciendo falta; dos contratos.

**Impacto:** ★★★★☆ UX + perf en z≈2–5. Muy alineado a “world = discovery → city”.

---

## 5. Plan priorizado

### P0 — Quick wins UX (0.5–1 día) · alto ROI percepción

| # | Cambio | Por qué |
|---|--------|---------|
| P0.1 | **No** hacer `setWorldClusters([])` al toggle / pan | Elimina el flash vacío |
| P0.2 | Debounce 250–400ms en `worldViewport` (como city) | Menos actions; menos thrash |
| P0.3 | Flag `worldLoading` + overlay sutil / opacity en pins stale | Feedback vs mapa “roto” |
| P0.4 | Skip fetch si bbox ⊆ cache + mismo `zBand` / `gridDeg` | Cache cliente LRU clave `grid\|roundedBbox` |
| P0.5 | Esperar bounds reales de Mapbox antes del primer fetch (o marcar approx como provisional) | Evita clusters “en cualquier lado” del approx |

Métrica: “mapa vacío al entrar a World” baja aunque el RPC siga lento.

### P1 — Backend aggregates reales (1–2 días) · crítico para latency

| # | Cambio | Por qué |
|---|--------|---------|
| P1.1 | Repo: llamar RPC `map_place_clusters` (dejar de traer 5000 places) | Orden de magnitud más rápido |
| P1.2 | Migración RPC v3: `city_count`, outlier snap en SQL, opcional `top_fiction_ids uuid[]` | Paridad funcional sin JS heavy |
| P1.3 | Covers/titles: **lazy** — 2ª request solo para clusters visibles / top-N, o al hover | First paint = conteos |
| P1.4 | DTO primera respuesta: `{ id, lat, lng, count, dominantCityId, cityCount, dominantShare }` sin `fictionCovers` | Payload mínimo |
| P1.5 | Subir cache clusters a `CacheConfig.medium` (10 min) o long en overview | Warm path casi gratis |
| P1.6 | Verificar índice `idx_locations_lat_lng` (+ filtro active/status vía places) con `EXPLAIN` | Evitar seq scan en bbox |

Métrica objetivo: p95 action clusters < 200–400ms en bbox típico.

### P2 — LOD semántico + datos limpios (2–3 días)

| # | Cambio | Por qué |
|---|--------|---------|
| P2.1 | Zoom 2–5: **pins por ciudad** (`listCityPlaceCounts` / group by city) | Pins estables en centros oficiales; click = enter city |
| P2.2 | Zoom 6–8: grid RPC fino (como hoy, vía SQL) | Detalle regional sin Place[] |
| P2.3 | Script/admin: listar places con `hypot(coord, city.center) > 2°` y corregir | Corta la raíz de “pins en SA” |
| P2.4 | Seed RSC overview al deep-link `mode=world` | TTI sin esperar moveend |
| P2.5 | Histéresis real: `Z_EXIT < Z_ENTER` (ej. 7 / 9) | Menos bounce (UX, no solo perf) |

### P3 — Escala (solo si hace falta)

| # | Cambio |
|---|--------|
| P3.1 | Tabla materializada / buckets por `z_band` |
| P3.2 | Prefetch tiles vecinos de bbox |
| P3.3 | MVT si el catálogo o el tráfico lo exigen |

---

## 6. Flujo objetivo (post P0+P1)

```
[Enter World]
  → (opcional) seed clusters overview
  → Mapbox ready → bounds reales
  → debounce → getMapClusters (RPC, DTO mínimo)
  → pintar pins count inmediatamente (stale OK)
  → lazy: enrich covers for top clusters / on hover

[Pan / zoom]
  → debounce + cancel inflight
  → si cache hit → instant
  → si miss → SWR (mantener pins viejos hasta replace)

[Click cluster]
  → dominant city + cityCount≤1 → city sandbox (path actual, sin bbox places)
  → else → easeTo zoom+
```

---

## 7. Prioridad vs esfuerzo

```
Impacto percibido
    ▲
    │  P1.1 RPC          ★★★★★  ← hacer primero después de P0 UX
    │  P0.1 no-clear     ★★★★☆
    │  P1.3 lazy covers  ★★★★☆
    │  P2.1 city pins    ★★★★☆
    │  P0.2 debounce     ★★★☆☆
    │  P2.3 fix geocodes ★★★☆☆ (calidad)
    │  P3 tiles          ★★☆☆☆ (después)
    └────────────────────────────▶ esfuerzo
         bajo              alto
```

**Orden de ejecución recomendado:** P0.1 → P0.2 → P1.1 → P1.3/P1.4 → P1.2 → P0.3–P0.5 → P2.

No hace falta P3 para el MVP free world actual.

---

## 8. Qué no hacer

- Reintroducir `getMapPlacesInBbox` / Place[] en world (regresión de volumen).
- Seguir clusterizando 5000 rows en Node “porque ya funciona el snap”.
- Limpiar `worldClusters` en cada request.
- Bloquear el primer paint esperando covers.
- Bajar `minZoom` más sin RPC rápida (empeora bbox y filas).

---

## 9. Checklist de validación

- [ ] Entrar a World desde City: pins visibles en &lt; 500ms (warm) / &lt; 1.5s (cold).
- [ ] Pan continuo: sin mapa vacío; pins viejos hasta replace.
- [ ] Network: 1 action liviana por moveend debounced; no SELECT de miles de places.
- [ ] Payload clusters sin covers &lt; ~20–40KB tipico.
- [ ] Click cluster París → sandbox París; sin pin en LatAm por outlier conocido.
- [ ] Deep link `?mode=world&lat=&lng=&z=` refresheable con clusters coherentes.
- [ ] City mode intacto (sin bbox fetch al pan).

---

## 10. Resumen ejecutivo

El mapa World se siente lento y vacío **porque el path de clusters no usa la RPC**: descarga hasta 5000 places, agrega en Node y además resuelve covers antes de pintar. Los pines “en cualquier lado” mezclan geocodes malos, bbox aproximado al entrar, y centroides de grid.

**Plan:** (1) UX stale + debounce, (2) RPC SQL como fuente única + covers lazy, (3) overview por ciudad a zoom muy bajo + limpieza de coords. Eso ataca latency y percepción sin abandonar el modelo “world = conteos → city sandbox”.

---

## Registro

### 2026-07-20 — Una sola migración

- Consolidadas 059–062 en **`059_map_place_clusters.sql`** (nadie las había aplicado).
- Aplicar solo esa.

### 2026-07-20 — Fix crash + RPC rápida

- Guard `fictionCovers ?? []` + `normalizeMapClusters` (cache/flight parcial).
- RPC rápida sin subqueries correlacionadas; sin covers en hot path (placeholder).
- Bust cache `world-clusters:v2:…`.

### 2026-07-20 — P0 + P1.1 implementados

- **P0:** no clear de clusters (SWR); debounce 300ms en viewport world; cache cliente por bbox⊆ + gridDeg; spinner solo si no hay stale; dim pins mientras fetch; sin bbox aproximado (espera Mapbox).
- **P1.1:** `getClustersInBbox` llama RPC `map_place_clusters` (migración `059`); ya no trae ≤5000 places a Node.
- Cache server clusters: `CacheConfig.medium` (10 min).
- **Requiere** aplicar `059_map_place_clusters.sql` en Supabase.

### 2026-07-20 — Análisis inicial

- Confirmado: `place.repository.impl.ts` → `getClustersInBbox` hace query `.from("places").limit(5000)` + bucket JS; **cero** `rpc('map_place_clusters')`.
- Confirmado: toggle World hace `setWorldClusters([])`.
- Confirmado: world fetch sin debounce (city sí tiene 300ms).
- Doc de diseño `free-world.md` §12 sigue siendo la dirección de producto correcta; este doc acota el gap de **performance post-MVP**.
