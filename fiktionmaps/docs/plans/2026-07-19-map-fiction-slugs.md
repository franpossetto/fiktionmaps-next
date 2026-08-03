# Map `?fiction=` public slugs

## Estado actual

- `?city=` ya usa **slug** (`paris-france`).
- `?fiction=` sigue usando **UUID** (uno o varios, CSV):  
  `/en/map?city=paris-france&fiction=8a7cbac8-2e24-463b-a4f2-cde0ca276d2b`
- Estado interno del mapa (selection, caches, place.fictionId, search pairs) = **UUID**.
- Escritura URL: `buildMapQueryString` / search pair → `fictionIds.join(",")`.
- Lectura URL:
  - `parseFictionIdsFromUrl(param, available)` — solo acepta tokens UUID presentes en `available`.
  - `parseFictionIdsFromParam` (client) — filtra con `isUuidString` **sin** catálogo; se usa en first paint y al cargar places **antes** de fictions.
- Links externos al mapa aún con fiction UUID (y a veces city UUID):
  - `fiction-detail.tsx` → `fiction=${id}&city=${firstCityId}` ← city UUID residual
  - `home-search.tsx` (mode map) → `fiction=${id}`
  - contribute preview, comments en `public-fiction-paths.ts`

`Fiction.slug` ya existe (NOT NULL) y es la URL canónica de `/fictions/<slug>`.

## Decisiones propuestas (alineadas a city slugs)

| Tema | Propuesta |
|------|-----------|
| Cutover | Directo: escribir solo slugs en `?fiction=`; sin redirects UUID |
| Interno | Seguir con UUID en state, filters, caches, `place.fictionId` |
| Multi-select | CSV de slugs: `fiction=slug-a,slug-b` (igual que hoy con UUIDs) |
| `fiction=none` | Se mantiene |
| Omitir param | Cuando todas las fictions de la ciudad están seleccionadas (igual que hoy) |
| Compat UUID | **No** (salvo que digas lo contrario): deep links viejos dejan de filtrar |

## Impacto

1. `lib/map/map-url.ts` — parse/build por slug ↔ id via `available`.
2. `map-page-client.tsx` — first paint y load paths deben resolver slug con catálogo (seed/cache), no con `isUuidString` solo.
3. Links: fiction-detail, home-search, search pair URL, contribute preview.
4. Opcional: añadir `fictionSlug` al search catalog entry para no depender de otro lookup al escribir URL.

## Dificultades / riesgos

### 1. Race places-before-fictions (importante)

Hoy `parseFictionIdsFromParam` asume UUID y puede filtrar pins **antes** de cargar fictions. Con slug puro eso **no** se puede sin catálogo → o se muestran todos los pins un momento, o hay que:

- En init: `parseFictionIdsFromUrl(fictionParam, initial.initialFictions)` (RSC seed ya trae fictions).
- En `applyPlaces` (sin fictions aún): no resolver slugs a ids; diferir el filtro fiction hasta `applyFictions`, **o** reutilizar el resultado ya parseado del seed/state.

Sin este cuidado hay un flash de “todas las fictions” en deep links slug.

### 2. Search pair escribe `entry.fictionId`

`MapFictionCitySearchEntry` no tiene slug. Al aplicar un hit hay que resolver `fictionId → slug` desde `availableFictions` / catálogo, o extender el entry con `fictionSlug`.

### 3. Ficción en URL pero no en la ciudad

Igual que hoy con UUID: si el slug no está en `available` de esa ciudad, el parse cae al default (todas). Comportamiento a conservar; no es 404.

### 4. City UUID residual en fiction-detail

Aunque el foco sea `?fiction=`, `exploreMapHref` aún pone `city=${firstCityId}`. Conviene corregirlo en el mismo cambio (`city.slug`) para no reintroducir UUID de ciudad.

### 5. Tildes / slug generation (nota aparte, no bloquea esto)

- **Runtime** (`generateSlug`): NFD + strip diacríticos → `Córdoba` → `cordoba`. Correcto; create/findOrCreate/admin usan esto.
- **Migración 058**: el backfill SQL no strippeaba diacríticos → `ó` caía en `[^a-zA-Z0-9]+` → `-` → `c-ordoba`. Ya lo corregiste a mano; **no hace falta tocar la migración**.
- Nada que cambiar en dominio para tildes, salvo que en el futuro se haga otro backfill SQL: ahí sí copiar la lógica NFD o generar desde app.

## Plan / checklist (ejecutar después)

- [ ] Acordar cutover sin compat UUID en `?fiction=`
- [ ] Actualizar `parseFictionIdsFromUrl` / `buildMapQueryString` (slug)
- [ ] Arreglar first-paint + `applyPlaces`/`applyFictions` para no flash
- [ ] Search pair + links (fiction-detail city+fiction, home-search, preview)
- [ ] Grep final UUID en `?fiction=` / `map?fiction=`
- [ ] Lint / tsc

## Criterios de aceptación

- `/map?city=paris-france&fiction=<slug>` filtra esa fiction.
- Cambiar selección de fiction reescribe URL con slug(s).
- Multi: `fiction=slug-a,slug-b`.
- Internamente selection sigue siendo UUID.
- Sin links públicos nuevos con `fiction=<uuid>` (ni `city=<uuid>` residual).
- Sin reintroducir `getPlacesInBbox` ni degradar seed RSC.

## Registro

_(vacío hasta ejecución)_
