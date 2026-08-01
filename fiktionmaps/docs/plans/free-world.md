# Free World — análisis de viabilidad

Documento de diseño (sin implementación). Objetivo: permitir que el usuario navegue el mapa con libertad (zoom-out / pan mundial) sin romper performance ni volver a las queries pesadas que ya eliminamos.

---

## 1. Estado actual (por qué no es free world)

| Pieza | Hoy | Efecto |
|--------|-----|--------|
| Fuente de pins | Toda la ciudad (`getCityPlacesCached`) | Payload acotado por `city_id` |
| Filtro fiction | En memoria sobre el cache de ciudad | No hay query mundial |
| Viewport | `placeInBbox` en cliente tras pan/zoom | **0** round-trips `getPlacesInBbox` en el mapa |
| Zoom | `minZoom = 12`, `maxZoom = 20` | No hay vista continente/mundo |
| Clustering | Supercluster **cliente** sobre el set ya filtrado | Escala a ciudad, no a planeta |
| URL | `?city=<slug>&fiction=…` | La ciudad define centro + qué datos existen |
| Bbox server | `getPlacesInBboxUseCase` / `getByBboxAndFictionIds` | Existe, **no se usa** en el path del mapa (retirado a propósito) |

El modelo mental actual es un **sandbox por ciudad**:

```
RSC seed(city) → cache ciudad → filtro fiction → filtro bbox (memoria) → Supercluster
```

`city=` no es solo UX: es el **shard de datos**. Sin él, la pregunta pasa a ser “¿qué lugares del mundo caben en esta respuesta?”.

Pan ya es libre (no hay `maxBounds`); el bloqueo real es el **piso de zoom 12** + **solo datos de una ciudad**. Si el usuario panéa lejos de la ciudad cargada, el mapa se siente vacío.

---

## 2. Qué pide Free World

Experiencia deseada (alineada a lo que imaginás):

1. Zoom bajo → visión mundial / regional con **clusters** (conteos, no miles de pins).
2. Zoom medio → clusters más finos / ciudades densas.
3. Zoom alto → lugares individuales (como hoy).
4. Pan libre entre continentes sin “saltos” obligatorios a otra ciudad.
5. Filtro por fiction sigue siendo útil, pero deja de estar atado a “ficciones de esta ciudad”.

`city=` pasaría de ser **obligatorio para datos** a ser **opcional para deep-link / foco** (igual que un bookmark de cámara).

---

## 3. El problema de volumen (el núcleo)

### Por qué `city=` resuelve volumen hoy

- Una ciudad típica = cientos / pocos miles de places → JSON + avatars xs manejable.
- Fiction filter reduce más.
- Supercluster trabaja sobre ese subset.

### Qué pasa sin `city=`

| Enfoque ingenuo | Por qué falla |
|-----------------|---------------|
| Cargar todos los places del mundo | Payload gigante; avatars; memoria; TTI |
| `getPlacesInBbox` en cada pan (zoom bajo) | Bbox continental = casi “todo el dataset”; N queries al moverse |
| Supercluster sobre N mundial en cliente | Transfer + index build + re-render |
| Fiction “todas” + bbox mundial | Peor caso: sin shard ni filtro |

El bbox existente hoy exige `fictionIds.length > 0` y devuelve **places completos** (con thumbs). Sirve para zoom alto + fiction acotada; **no** es la API de free world a zoom 3–8.

---

## 4. Principio de diseño: LOD (level of detail) por zoom

La intuición “clusters primero → zoom → lugares” es la correcta. Hay que formalizarla como **contratos de datos distintos por nivel de zoom**, no como “la misma query con más filas”.

```
Zoom 0–5   (mundo / continente)  → agregados / clusters server (conteo + centroide)
Zoom 6–10  (país / región)       → agregados más finos o top-N hotspots
Zoom 11–13 (metro / ciudad)      → places ligeros o clusters densos (cap duro)
Zoom 14+   (calle)               → places completos (path actual o bbox acotado)
```

Umbrales exactos a tunear; lo importante es **no devolver el mismo shape de `Place[]` en todos los zooms**.

---

## 5. Opciones para gestionar volumen

### A. Viewport fetch + hard caps (rápido de prototipar)

- Debounce pan/zoom → `bbox + zoom + fictionIds?`.
- Server: places en bbox con `LIMIT` (ej. 300–500) + orden (densidad, popularidad, o grid sample).
- Cliente: Supercluster como hoy.

**Pros:** reutiliza casi todo el mapa actual; bbox repo ya existe.  
**Contras:** a zoom bajo el LIMIT miente (huecos); “world overview” incompleto; reintroduce round-trips que #1 eliminó.

**Veredicto:** útil como **modo zoom alto sin ciudad**, no como free world completo.

### B. Server-side aggregation / grid clusters (recomendado como núcleo)

- A zoom bajo el server no lista places: responde **clusters** `{ lat, lng, count, (opcional) sampleImage }`.
- Implementaciones posibles:
  1. **Grid / geohash** agrupado en SQL (PostGIS `ST_SnapToGrid` / geohash bucket) por viewport.
  2. **Precomputar** buckets (tabla `place_clusters` o materializada por zoom).
  3. **H3 / quadkey** index offline + lookup por tile.

**Pros:** payload chico y estable (decenas–cientos de puntos); escala con el catálogo.  
**Contras:** nuevo contrato API + UI de cluster “opaco” (click = zoom, no sidebar de place).

**Veredicto:** encaja con la UX que describís; es el camino serio.

### C. Vector tiles / MVT (máxima escala)

- Tiles por `z/x/y` con puntos o aggregates.
- Mapbox GL native clustering o layers vectoriales.

**Pros:** estándar industria (Airbnb-style maps); cache CDN; pan fluido.  
**Contras:** infra (generación tiles, refresh al aprobar places), más lejos del stack actual (Supabase + Supercluster React).

**Veredicto:** fase 2/3 si el volumen crece mucho; no hace falta para un MVP free world si B funciona.

### D. Híbrido por modo (pragmático para Fiktion Maps)

Mantener **dos modos** explícitos en producto:

| Modo | Zoom | Datos | URL |
|------|------|-------|-----|
| **City** (actual) | min 12 | seed ciudad + filtro memoria | `?city=` requerido |
| **World** (nuevo) | min ~2–3 | LOD por zoom (B + A en detalle) | `city=` opcional; `lat/lng/z` o bbox en URL |

Transición:

- Desde City: botón “Explorar el mundo” → baja minZoom, cambia data source.
- Desde World: al acercarse a una ciudad densa o al elegir city en search → opcional “entrar” al sandbox ciudad (mejor perf local).

**Veredicto:** reduce riesgo; no rompe el path optimizado que ya midieron en `improvements-next-js.md`.

---

## 6. Arquitectura propuesta (híbrido + LOD)

### 6.1 Contratos de aplicación (use cases nuevos)

Respetar la arquitectura del repo: domain port → supabase repo → use case → action/query.

1. **`listMapClustersInBbox`**  
   Input: `bbox`, `zoom` (o `gridSize`), `fictionIds?`.  
   Output: `{ id, lat, lng, count }[]` (sin avatars por place).  
   Cap: p.ej. máx 200 clusters por respuesta.

2. **`listMapPlacesInBbox`** (evolución del bbox actual)  
   Input: `bbox`, `fictionIds?`, `limit`, `cursor?`.  
   Output: places **ligeros** para pins (id, lat/lng, fictionId, thumb xs, name/slug).  
   Solo se llama si `zoom >= Z_DETAIL` **y** área del bbox < umbral (evitar continent-sized detail queries).  
   Fiction vacío: o “todas” con límite estricto, o exigir fiction en world (decisión de producto).

3. **City path sin cambios**  
   Seguir siendo el default / deep link con `?city=` para perf predecible.

### 6.2 Cliente mapa

```
onMoveEnd (debounced)
  if mode === city → filtro memoria (hoy)
  if mode === world:
       if zoom < Z_DETAIL → fetch clusters → render ClusterMarker (count)
       else → fetch places (cap) → Supercluster local (como hoy)
```

Reglas anti-abuso:

- Debounce 200–400ms; cancelar request inflight.
- No fetch si el bbox nuevo ⊆ bbox ya cargado (con margen) y mismo zoom band.
- Cache cliente por clave `zBand|roundedBbox|fictionHash` con TTL / LRU.
- Soft max: si el usuario pide detail en bbox enorme → forzar cluster response o pedir más zoom.

### 6.3 Fiction en world mode

Hoy “todas las fictions” = todas las de la **ciudad**. En world:

| Opción | Comportamiento |
|--------|----------------|
| **W1** Sin fiction = todos los places (LOD) | Más wow; queries más pesadas |
| **W2** Sin fiction = clusters globales; detail exige fiction o zoom muy alto + cap | Más seguro |
| **W3** Fiction multi-select global (catálogo distinto al city fictions) | Mejor producto a medio plazo |

Recomendación: **W2 para MVP**, luego W1/W3 cuando haya aggregates indexados.

### 6.4 URL / deep links

Persistir cámara en world mode (hoy no se guarda zoom/center):

- `?lat=&lng=&z=` (y opcional `fiction=`)
- `city=` solo si se “entra” a sandbox o como hint de foco inicial
- Compat: `/map?city=paris-france` sigue igual (modo city)

Sin esto, free world no es compartible ni refresheable.

### 6.5 Índices DB (imprescindible antes de abrir world)

Sobre `locations` (o vista places+locations):

- Índice compuesto / GiST si hay PostGIS: `(latitude, longitude)` o geography.
- Filtros: `places.active`, `places.status`, `fiction_id`.
- Para aggregates: función SQL o RPC `map_clusters(bbox, zoom, fiction_ids[])` en vez de traer rows y agrupar en Node.

El `getByBboxAndFictionIds` actual (4 inequalities en embed) **no escala** a world sin índice + límites + shape liviano.

---

## 7. UX concreta

1. **Toggle** “City / World” (o auto: zoom-out del min 12 implica salir de city mode).
2. Click en **cluster world** → `easeTo` zoom+ (no abre sidebar).
3. Click en **place** → mismo sidebar (`getMapLocationPanel`) — sin cambio.
4. Search fiction/city/place:
   - City/place hit → puede centrar + opcional entrar a city mode.
   - Fiction hit en world → setea filtro global y mantiene cámara (o fly a bbox de esa fiction).
5. Empty ocean: normal; no inventar pins.
6. Mantener spiderfy solo en detail layer.

Cuidado: no mezclar en el mismo frame clusters server (agregados) y Supercluster cliente sobre un subset parcial — dos semánticas de “cluster” confunden. Separar capas: `WorldAggregateLayer` vs `PlaceClusterLayer`.

---

## 8. Fases sugeridas

### Fase 0 — Producto / métricas (1 sesión)

- Definir: ¿world es default o opt-in?
- Contar: places totales, p95 places/ciudad, p95 places por fiction, densidad en top cities.
- Decidir W1/W2/W3 y umbrales `Z_DETAIL`, caps.

### Fase 1 — MVP “zoom libre acotado” (bajo riesgo)

- Bajar `minZoom` solo en **modo World** (opt-in).
- World detail: bbox places con **limit + fiction requerida** (reusar/adaptar bbox use case, payload liviano).
- Zoom bajo: o bien **no mostrar pins** + CTA “acercá o elegí fiction”, o aggregates mínimos (grid SQL simple).
- URL `lat/lng/z`.
- City mode intacto (sigue siendo el path de `improvements_next_js` #1–#3).

### Fase 2 — Clusters server reales

- RPC/use case `listMapClustersInBbox`.
- Capas UI separadas.
- Cache query + índices.
- Fiction opcional en aggregates.

### Fase 3 — Escala

- Preagregación / tiles si el catálogo o el tráfico lo exigen.
- Catálogo de fictions global para el filtro world.
- Prefetch vecinos de bbox.

---

## 9. Riesgos y decisiones abiertas

| Riesgo | Mitigación |
|--------|------------|
| Reintroducir spam de `getPlacesInBbox` (#1 regresion) | World-only; debounce; cache; nunca en city mode |
| Payload con avatars en bbox | Places “pin DTO” sin description/scenes; thumbs xs only / lazy |
| Antimeridian (Pacific) | Split bbox o normalizar lon; el range actual `west–east` se rompe |
| Fiction “todas” = query infinita | Caps + aggregates; no full Place[] |
| City camera jump vs free pan | En world, search/city no debe forzar `CityCameraController` salvo deep link |
| Doble semántica de cluster | Capas y zoom bands claros |
| SEO / sitemap | Free world es app map; no cambia páginas city/fiction |

**Decisiones a cerrar antes de codear:**

1. ¿Opt-in toggle o reemplazo del mapa actual?
2. ¿Fiction obligatoria en world detail (W2)?
3. ¿`city=` desaparece del default o convive?
4. ¿MVP con “sin pins a zoom bajo” o ya aggregates en Fase 1?

---

## 10. Relación con trabajo reciente

- **No contradice** el seed RSC por ciudad: ese path sigue siendo el óptimo para `/map?city=…`.
- **No revive** bbox en city pan.
- El repo `getByBboxAndFictionIds` es **punto de partida** solo para la banda de detalle, no para el overview.
- Clustering cliente (Supercluster) se **conserva** para places ya cargados; no sustituye aggregates mundiales.
- City/fiction slugs en URL son ortogonales; world añade `lat/lng/z`.

---

## 11. Recomendación

**Sí es viable**, pero no como “quitar el minZoom y pedir todos los places”.

Camino recomendado:

1. **Modo híbrido City (default) + World (opt-in).**
2. **LOD por zoom**: aggregates server abajo, places con cap arriba.
3. **City sandbox intacto** para no regresar al baseline de N× bbox.
4. Empezar por Fase 1 (cámara libre + bbox limitado + URL) solo si querés validar demanda; si la promesa es “ver el mundo en clusters”, ir directo a **Fase 1+2** (sin ships un world vacío a zoom bajo).

La feature que los users piden (“moverme libre”) es 20% UI de zoom y **80% contrato de datos**. El volumen se gestiona dejando de tratar el planeta como una ciudad grande.

---

## 12. Estrategia revisada: World = conteos → click = City sandbox

Propuesta de producto (post-MVP):

1. A zoom bajo/medio: solo **clusters con recuento** (free world).
2. Click en un cluster “de París” → **entrar al sandbox ciudad** (`city=paris-france`), mismo path que hoy (seed + cache + Supercluster local).
3. Si el user **zoom-out** pasado un umbral → **salir de ciudad**, limpiar `city=`, volver a clusters por número.
4. Visual: clusters world con el **mismo chrome** que `ClusterMarker2d` (no bolas rojas planas).

### Veredicto

**Sí: es la estrategia correcta y más ligera que el MVP actual** (que carga `Place[]` por bbox a zoom ≥12 en world). El detalle de lugares debería vivir casi siempre en el **city sandbox**, no en free world.

Free world deja de ser “mapa mundial de pins” y pasa a ser **navegación / discovery** hacia ciudades. Eso reusa el path ya optimizado (`improvements_next_js` #1–#3) y evita el problema de volumen.

### Por qué funciona bien (y ligero)

| Capa | Datos | Peso |
|------|--------|------|
| World (zoom bajo) | `{lat,lng,count, cityId?}` aggregates | Muy liviano |
| Transición | 1 click → `getCityPlacesCached` (o cache hit) | Ya existe |
| City (zoom alto) | Places de **una** ciudad en memoria | Acotado |
| Zoom-out | Borrar city, otra vez aggregates | Sin bbox places |

**No hace falta** (y conviene **sacar**) el `getMapPlacesInBbox` del world detail del MVP: es el punto más caro y el que más se parece a “ciudad grande”.

### Crítica — dónde se rompe si no se diseña fino

**1. Cluster ≠ ciudad (el riesgo #1)**  
Un grid a zoom 5 puede ser “todo Île-de-France” o mezclar París + banlieue + otra ciudad. Saltar a “París” a ciegas engaña.

- A zoom muy bajo: click = **solo zoom-in** (easeTo), sin asignar ciudad.
- Solo a partir de `Z_ENTER` (p.ej. 8–10), o si el aggregate trae **`dominantCityId`** con mayoría clara (p.ej. ≥70% de places del bucket), click = entrar a esa ciudad.
- El RPC/fallback debe devolver `dominant_city_id` (+ opcional `sample_image_url`), no solo count.

**2. Bounce city ↔ world (histéresis)**  
Si “entrar” a z≥10 y “salir” a z&lt;10, al pinchar el user oscila.

- `Z_EXIT` &lt; `Z_ENTER` (ej. entrar ≥10, salir ≤8).
- Salir solo tras `moveend` estable, no en cada frame del easeTo.
- Entrar a ciudad por **click**, no auto al cruzar zoom (el auto-enter es frágil cerca de fronteras).

**3. Zoom-in sin click**  
Si el user hace pinch hasta z=14 en el Atlántico o entre dos ciudades: ¿mapa vacío?

Opciones (elegir una):

- **A (recomendada, ligera):** sin ciudad = solo aggregates; a z alto sin ciudad, CTA “Elegí un área” / seguir mostrando clusters finos, **sin** `Place[]` mundial.
- **B:** auto nearest-city al cruzar `Z_ENTER` — cómodo pero mágico y pelea con fronteras.
- **C:** bbox places (MVP actual) — funciona pero **no** es lo más ligero; solo como red de seguridad con cap duro.

Recomendación: **A + click-to-city**. Coherente con “free world = conteos; detalle = ciudad”.

**4. Visual de pines**  
Las bolas rojas rompen la marca. World clusters deberían reusar `ClusterMarker2d` (puntero + frame + badge count). Imagen: `sample` del bucket o cover de fiction dominante; si no hay, un placeholder del design system — no un círculo flat distinto.

En city mode: pins actuales sin cambio.

**5. Fiction filter**  
En world, fiction global es cara. Al **entrar** a ciudad, el filtro fiction de esa ciudad vuelve (como hoy). No mezclar chips de fiction de Chicago mientras el scope dice Free world.

**6. CitySelector vs cámara**  
Con “limpiar ciudad” al zoom-out, el selector no debería gritar una ciudad “seleccionada” que ya no rige el mapa (mismo bug que el search chip). Scope = Free world hasta que haya `city=` activo.

### Flujo recomendado (estado)

```
[World] zoom < Z_EXIT
  → aggregates only (ClusterMarker2d + count)
  → click coarse → easeTo
  → click fine + dominantCity → enter City

[City] city=slug, minZoom soft floor opcional
  → seed/cache places (path actual)
  → fiction filter UI
  → zoom-out estable ≤ Z_EXIT → exit City → World (clear city=, keep lat/lng/z)
```

### Qué cambiar respecto al MVP codeado

1. **Retirar** (o degradar a experimental) places-by-bbox en world.
2. Extender aggregates con `dominantCityId` (+ sample thumb).
3. Click cluster: zoom vs enter-city según zoom/confianza.
4. Zoom-out con histéresis → clear city.
5. Restyle world markers → `ClusterMarker2d`.
6. Toggle “Mundo” puede quedar como atajo a zoom-out / forzar world; el modo también puede ser **implícito** por zoom + presencia de `city=`.

### Conclusión

La intuición es buena: **free world = índice por conteo; el “mapa de verdad” sigue siendo por ciudad**. Es más simple de operar, más barata, y alinea UX con la arquitectura que ya funciona.

Lo único que hay que hacer bien (si no, se siente roto): **resolución cluster→ciudad**, **histéresis de salida**, y **no dejar al user en zoom alto sin ciudad ni pins** sin un empty state claro.

---

## Registro

### 2026-07-19 — MVP implementado (Fase 1+2 híbrido)

- Modo **City** (default) intacto: seed ciudad, filtro memoria, minZoom 12, sin bbox fetch.
- Modo **World** opt-in (toggle header): minZoom 2, URL `?mode=world&lat=&lng=&z=`.
- LOD: `zoom < 12` → RPC `map_place_clusters` (migración `059`); `zoom >= 12` → `getByBbox` con cap 400.
- Click cluster world → easeTo zoom+ (no `city=`).
- City/search → vuelve a sandbox ciudad.
- Fiction filter oculto en world (W2 simplificado: sin filtro fiction en MVP).
- **Requiere** aplicar migración `059_map_place_clusters.sql` en Supabase.

### 2026-07-19 — Covers xs, hover fan, outlier geocode snap

- Covers: solo variant **xs** (256px).
- Hover: las cartas se despliegan en abanico.
- **Datos:** varios places de Amélie tienen lat/lng de Buenos Aires (`-34.61,-58.39`) con `city_id=Paris` → el pin salía en SA y el click iba a París. Mitigación: si coord está a >2° del centro de su ciudad, se clusteriza en el centro de la ciudad (y no pinta fantasmas fuera del bbox). Conviene corregir esos rows en DB.

### 2026-07-20 — Perf P0 + RPC

- Ver `free-world-perf.md`. Cliente SWR/debounce; repo usa RPC `map_place_clusters` (migración `059`) en lugar de ≤5000 places en Node.
