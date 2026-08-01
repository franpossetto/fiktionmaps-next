# City public slugs

## Estado actual (antes del cambio)

- `cities` no tenía `slug`; identidad pública = UUID (`/[locale]/cities/[cityId]`, `/map?city=<uuid>`).
- Dominio: `City { id, name, country, lat, lng, zoom, image_url, … }`.
- Creación: admin (`createCityAction`) y geolocalización (`GeoProvider` → `findOrCreateCityAction` → `findOrCreateCityUseCase` por `name+country`).
- Mapa (post `9b974ba`): RSC seed por UUID; pan/zoom filtra cache local (sin `getPlacesInBbox`).
- SEO: city pages con canonical UUID; `sitemap.ts` no incluía ciudades.
- `listCityIdsWithPlaces` **no** filtra `approved`/`active` (a diferencia del sitemap de places).

## Decisiones

| Tema | Decisión |
|------|----------|
| Cutover | Directo: sin redirects ni URLs UUID públicas |
| Rutas | `/[locale]/cities/<slug>`, `/map?city=<slug>` |
| Interno | UUID para FKs, caches, localStorage, selectors |
| Formato | `{ciudad}-{pais}`; colisión → `{ciudad}-{region}-{pais}`; último → `-2`, `-3` |
| `region` | **No** columna DB. Opcional solo en creación (Mapbox) para candidatar el slug |
| Admin | Auto al crear; editable al editar; renombrar **no** regenera slug |
| Sitemap / index | Solo ciudades con ≥1 place `active` + `status=approved` |
| Migración | Backfill provisional `{name}-{country}`; UNIQUE + NOT NULL; corrección manual en admin |

## Riesgos / correcciones al plan

1. **No añadir `region` a DB** — no hay mantenimiento estable; Mapbox la aporta al crear. Sin región en backfill → counter si choca.
2. **Elegibilidad SEO ≠ `listCityIdsWithPlaces`** — use case propio con filtro approved/active (como places sitemap).
3. **Páginas vacías** — `robots: noindex` si no hay contenido público (además de excluir del sitemap).
4. **Concurrencia** — UNIQUE en DB + reintento en insert (no solo check-then-insert).
5. **Working tree** — mejoras de mapa ya en `9b974ba`; no se reintrodujeron bbox fetches.

## Impacto

- Ruta rename `[cityId]` → `[slug]`.
- Links públicos: home search, navbar, fiction rail, city detail, place→map, map URL builders.
- Caches de mapa siguen keyed por `city.id`.
- Tipos Supabase + migración `058`.

## Plan / checklist

- [x] Análisis contra código real
- [x] `city-slugs.md`
- [x] Migración `cities.slug` UNIQUE NOT NULL + tipos
- [x] Domain slug helpers + entity/schemas/port
- [x] Repo + use cases (getBySlug, create/findOrCreate con slug, update slug, sitemap)
- [x] Queries/actions Next
- [x] Ruta `[slug]` + metadata
- [x] Mapa `?city=slug` + URL writers
- [x] Links internos públicos
- [x] Sitemap + robots meta ciudades vacías
- [x] Admin slug auto/editable
- [x] Geo: region opcional al create
- [x] Validación grep / lint / tsc

## Criterios de aceptación

- `/en|es/cities/<slug>` resuelven por slug.
- `/map?city=<slug>` seed correcto; cambios de ciudad escriben slug.
- Sin links públicos con UUID de ciudad.
- UUID interno intacto (DB/cache/localStorage).
- Create admin + findOrCreate generan slug; colisiones legibles + UNIQUE.
- Canonical/hreflang con slug; sitemap solo ciudades con places públicos.
- Sin `getPlacesInBbox` en pan/zoom normal.
- Lint/typecheck OK.

## Registro de implementación

### Implementado

- Migración `058_cities_slug.sql` + `database.types.ts` (`cities.slug`).
- Dominio: `city-slug.ts`, `City.slug`, schemas create/update, port `getBySlug` / `findSlugsByPrefix` / `listWithPublicPlaces` / `hasPublicPlaces`.
- Use cases: `create` (candidatos + retry), `findOrCreate`, `update` (slug solo explícito), `get-city-by-slug`, `list-cities-for-sitemap`, `city-has-public-places`.
- Ruta pública `app/.../cities/[slug]`; mapa resolve/write slug; links home/navbar/rail/place→map.
- Sitemap vía `listCitiesForSitemapCached`; empty cities `noindex`.
- Admin: slug auto en create; campo editable en edit; region Mapbox solo para candidatos.
- GeoProvider: pasa `region` opcional a `findOrCreateCity`.

### Validaciones

- Grep: sin `/cities/${…id}` ni `map?city=${…id}` públicos; sin `[cityId]` route; sin `isUuidString` en `?city=`.
- `npx tsc --noEmit` OK (tras limpiar `.next/types` stale del rename).
- `npm run lint` OK (0 errors; warnings preexistentes).
- Sin suite de tests unitarios en el repo para cities.

### Pendiente operativo

1. Aplicar migración local/prod (`supabase db push` / migrate).
2. Revisar/corregir slugs provisionales del backfill en admin (pocas ciudades).
3. Regenerar tipos con `npm run gen:types` si preferís CLI vs el patch manual ya hecho.
