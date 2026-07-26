# Map ↔ Fiction pages: ¿relación bidireccional y ahorro de queries?

## Motivación

Si estoy en mapa `paris + amelie` y voy a `/fictions/amelie` (o al revés), ¿la “query es la misma” y podemos ahorrar fetches?

## Veredicto

**Navegación bidireccional: sí, barata y útil.**  
**Ahorro real de queries: casi no.** Los payloads no son el mismo shape; las caches no se comparten entre rutas. La idea de “misma query ⇒ menos red” es engañosa.

---

## Qué carga cada lado hoy

| | Fiction page | Map |
|--|--------------|-----|
| Eje | 1 fiction → places en **todas** las ciudades | 1 city → places/fictions de **toda** la ciudad |
| Queries típicas | fiction by slug, places by fiction, cities, likes, interests, contributors, sidebar… | all cities, city places, city fictions (+ panel al abrir pin) |
| Cache server | `fiction:places:{id}`, etc. | `city:places:{id}`, `city:fictions:{id}` |
| Cache client | ninguna hacia el mapa | `city-map-data-cache` (solo mapa, keyed por city UUID) |

La intersección (places de Amélie en París) es un **subconjunto** de ambos, no una entrada compartida. Tags `places`/`fictions` se invalidan juntos; **las keys no se reutilizan** al cruzar de página.

---

## 1. Bidireccionalidad de URL / UX

### Mapa → Fiction page

Fácil y sin ambigüedad:

- Contexto: `city` + `fiction` (+ opcional `place`).
- Destino canónico: `/fictions/<fiction-slug>` (la page agrupa todas las ciudades).
- Si hay pin: `/fictions/<slug>/places/<place-slug>` (ya existe desde sidebar).

No hace falta “preguntar ciudad”. La page no es city-scoped.

### Fiction page → Mapa

Aquí sí hay ambigüedad:

| Ciudades de la fiction | Comportamiento razonable |
|------------------------|---------------------------|
| 0 | Solo `?fiction=` o deshabilitar explore |
| 1 | `/map?city=<slug>&fiction=<…>` automático |
| 2+ | Preguntar ciudad **o** ir a la “primaria” (hoy: primera del orden) con opción de elegir |

Hoy Explore Map usa **primera ciudad** y además pasa **city UUID** mientras el mapa espera **slug** → deep link roto/aleatorio. Eso es un bug de cableado, no un argumento contra la idea.

### Place page → Mapa

Ya es el puente bueno: `city=slug` + `fiction` + `place` + `openSidebar`. Modelo a copiar en fiction detail.

---

## 2. ¿Se ahorran queries?

| Escenario | ¿Ahorro? | Por qué |
|-----------|----------|---------|
| Soft-nav SPA con seed client del mapa desde fiction | Parcial, **solo mapa** | Podrías `seedCityMapData` con un subset; igual el mapa pide **city places** (todas las fictions de la ciudad), no solo las de Amélie. O hacés una query nueva fiction×city — no elimina trabajo, lo cambia. |
| Fiction page tras venir del mapa | Casi **cero** | Detail necesita likes/interests/contributors/recs/sidebar. Places by fiction ≠ city places en cache. Full navigation = nuevo RSC tree. |
| Warm `unstable_cache` server | Marginal | Segunda visita hit cache; ya pasa sin “bidireccionalidad”. |
| Prefetch Next `<Link>` | HTML/JS de ruta, no tus use cases de negocio | No sustituye getCityPlaces / getFictionPlaces. |

**Conclusión crítica:** unificar la *experiencia* (misma pareja city+fiction en la URL) ≠ unificar el *data fetch*. Ahorrar queries de verdad implicaría rediseñar contratos (p.ej. endpoint fiction×city + hidratar ambos lados) — costo alto, ROI dudoso con poco tráfico.

Lo que sí vale la pena (barato):

1. Arreglar fiction→map: `city.slug` (+ fiction slug si algún día se hace).
2. Multi-ciudad: picker o confirmación en vez de elegir en silencio la primera.
3. Prefetch hover “Explore map” → `prefetchCityMapData(cityId)` (mejora percibida; no reduce queries del article).

---

## 3. Casos que se complican

1. **Fiction multi-ciudad** — page→map necesita ciudad; map→page no.
2. **Multi-fiction en mapa** (`fiction=a,b` o “todas”) — ¿a qué article vas? Solo tiene sentido con **una** fiction seleccionada (o CTA por pin/chip).
3. **`fiction=none` / sin filtro** — no hay page equivalente.
4. **Place en otra ciudad que la del mapa** — irrelevante si el pin ya fija place+city.
5. **SEO** — no indexar combos de mapa; el article sigue siendo la URL canónica.

---

## Recomendación

| Idea | ¿Goal? |
|------|--------|
| Navegación bidireccional clara (URLs + picker multi-city) | **Sí** — UX / corrección del deep link roto |
| “Misma query ⇒ menos fetches” como arquitectura | **No priorizar** — shapes distintos; ahorro real es ilusorio sin rediseño |
| Prefetch city map desde Explore | Nice-to-have P2 (ya listado en improvements) |

**Orden sensato:** (1) fix city slug en Explore Map, (2) UX multi-ciudad page→map, (3) prefetch opcional. No invertir en cache compartida cross-route hasta medir que el cruce mapa↔article sea un hot path.
