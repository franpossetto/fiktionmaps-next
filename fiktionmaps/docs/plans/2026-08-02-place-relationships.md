# Plan: `place_relationships` — relaciones entre places (genérica, con tipo)

Status: propuesta para revisión. Reemplaza a `2026-07-26-place-relations.md` (ver §1).
Las migraciones se **generan**, nunca se aplican desde el agente.

## Goal

Poder declarar que dos o más places están relacionados, con dos tipos en v1:

| type | Significado | Ejemplo |
|------|-------------|---------|
| `shared` | Mismo lugar real, distintas ficciones | Empire State en 30 películas |
| `composite` | Mismo lugar ficcional, distintos lugares reales | Un hotel filmado en 4 edificios |

Una tabla de grupo + una de miembros. Sin columnas nullables en `places`.

---

## 1. Por qué se descarta el plan anterior

`2026-07-26-place-relations.md` propone derivar `shared` de `places.location_id` compartido
("already expressible today") y usar tablas solo para `composite`. **Esa premisa es falsa contra
el código actual.**

`create()` inserta una `locations` nueva sin ningún lookup previo:

```892:905:fiktionmaps/src/places/infrastructure/supabase/place.repository.impl.ts
      const { data: locationRow, error: locationError } = await supabase
        .from("locations")
        .insert({
          city_id: data.cityId,
          name: locationName,
          formatted_address: data.formattedAddress?.trim() || locationName,
          post_code: null,
          latitude: data.latitude,
          longitude: data.longitude,
          external_id: null,
          provider: "mapbox",
```

Hay una `location` por `place`. Dos places nunca comparten `location_id`, así que la query de
siblings del plan viejo devuelve siempre cero filas.

### 1.1 Y no se puede derivar de otra columna

- **Coordenadas**: salen del feature de Mapbox que el usuario elige en el buscador
  (`handleAddressSelect` copia `result.lat/lng`; el mapa es de solo lectura, sin drag ni click).
  El buscador ofrece `address`, `street` y `poi` a la vez, así que el mismo edificio elegido como
  POI o como dirección da coordenadas distintas — decenas o cientos de metros según el tamaño.
- **`external_id`**: hoy se guarda `null`, y aunque se guardara sería la misma señal que la
  coordenada (ambas salen de la misma elección). Además el `mapbox_id` de `/suggest` es de sesión
  y los `feature.id` de Geocoding v5 rotan entre releases.
- **Radio fijo**: tiene falsos negativos (edificio grande: ingreso vs centroide) y falsos
  positivos (el bar de planta baja vs el edificio que lo contiene).

**Conclusión: la identidad no se puede derivar, tiene que declararse.** De ahí la tabla.

### 1.2 Lo que queda pendiente aparte de este plan

Nada de esto bloquea la tabla, pero sin ello cada landmark popular exige curación manual por
ficción nueva, indefinidamente:

- Reuso de `location_id` en el wizard: buscar locations cercanas al confirmar la dirección y
  ofrecer "¿es exactamente este lugar?". Como las coordenadas vienen del feature sin ajuste
  manual, **un match exacto de `(latitude, longitude)` significa "eligieron el mismo feature"** y
  es un candidato automático confiable y barato.
- Persistir el `mapbox_id` + `feature_type` en `locations.external_id` / `provider` (útil como
  señal débil y para debug, no como clave).

Se documenta acá para no perderlo; va en un plan aparte.

---

## 2. Modelo de datos

```
place_relationships          (id, type, name, slug, created_at, updated_at)
place_relationship_members   (id, place_relationship_id, type, place_id, created_at)
```

### 2.1 Por qué `type` está duplicado en `members`

Las dos relaciones tienen cardinalidad distinta:

- `shared`: un place puede estar en un solo grupo `shared` (o está en un lugar real o en otro).
- `composite`: un place pertenece a un solo venue en v1.
- Pero un mismo place puede estar en **ambos** a la vez: `p1` es el Palacio Barolo (compartido con
  otras 4 ficciones) y además es la fachada del "Grand Budapest" (junto a `p9`).

Un `UNIQUE (place_id)` global lo prohibiría. Lo que hace falta es un único **por tipo**, y `type`
vive en la tabla padre, así que hay que denormalizarlo en `members` con FK compuesta para que
Postgres pueda garantizar que ambos coinciden. La alternativa es un trigger; la FK compuesta es
más barata y declarativa.

### 2.2 Ejemplo

```
place_relationships
  r1  shared     "Palacio Barolo"
  r2  composite  "Grand Budapest Hotel"

place_relationship_members
  r1  shared     p1, p2, p3, p4, p5     ← 5 ficciones en el mismo edificio
  r2  composite  p1, p9                 ← fachada + lobby, misma ficción
  r3  composite  p1                     ✗ rechazado: p1 ya está en el venue r2
```

---

## 3. Migración `072_place_relationships.sql`

```sql
-- Relaciones declaradas entre places. La identidad de "mismo lugar real" no es derivable
-- (cada place crea su propia location, y ni coordenadas ni external_id son estables entre
-- features de Mapbox), así que se cura explícitamente.

CREATE TABLE IF NOT EXISTS public.place_relationships (
  id         UUID        NOT NULL DEFAULT gen_random_uuid(),
  type       TEXT        NOT NULL,
  name       TEXT        NOT NULL,
  slug       TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT place_relationships_pkey PRIMARY KEY (id),
  CONSTRAINT place_relationships_slug_unique UNIQUE (slug),
  CONSTRAINT place_relationships_type_check CHECK (type IN ('shared', 'composite')),
  -- Requerida por la FK compuesta de members (§2.1).
  CONSTRAINT place_relationships_id_type_unique UNIQUE (id, type)
);

CREATE TABLE IF NOT EXISTS public.place_relationship_members (
  id                     UUID        NOT NULL DEFAULT gen_random_uuid(),
  place_relationship_id  UUID        NOT NULL,
  type                   TEXT        NOT NULL,
  place_id               UUID        NOT NULL REFERENCES public.places (id) ON DELETE CASCADE,
  created_by             UUID        REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT place_relationship_members_pkey PRIMARY KEY (id),
  -- Un place no puede figurar dos veces en el mismo grupo.
  CONSTRAINT place_relationship_members_unique UNIQUE (place_relationship_id, place_id),
  -- Garantiza que members.type siempre coincide con el del grupo padre.
  CONSTRAINT place_relationship_members_group_fkey
    FOREIGN KEY (place_relationship_id, type)
    REFERENCES public.place_relationships (id, type) ON DELETE CASCADE
);

COMMENT ON COLUMN public.place_relationship_members.type IS
  'Denormalizado del grupo padre vía FK compuesta. Existe solo para poder aplicar los índices
   únicos parciales por tipo: un place puede estar en un shared y un composite a la vez, pero
   no en dos del mismo tipo.';

CREATE UNIQUE INDEX IF NOT EXISTS idx_place_rel_members_one_shared
  ON public.place_relationship_members (place_id) WHERE type = 'shared';
CREATE UNIQUE INDEX IF NOT EXISTS idx_place_rel_members_one_composite
  ON public.place_relationship_members (place_id) WHERE type = 'composite';

-- "Relaciones de este place" es la query de la ficha de place; ni la PK ni el unique la sirven.
CREATE INDEX IF NOT EXISTS idx_place_rel_members_place
  ON public.place_relationship_members (place_id, place_relationship_id);

DROP TRIGGER IF EXISTS set_place_relationships_updated_at ON public.place_relationships;
CREATE TRIGGER set_place_relationships_updated_at
  BEFORE UPDATE ON public.place_relationships
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
```

### 3.1 RLS + grants (convención 041 / 057)

```sql
ALTER TABLE public.place_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.place_relationships FORCE ROW LEVEL SECURITY;
ALTER TABLE public.place_relationship_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.place_relationship_members FORCE ROW LEVEL SECURITY;

GRANT SELECT ON public.place_relationships TO anon, authenticated;
GRANT SELECT ON public.place_relationship_members TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.place_relationships TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.place_relationship_members TO authenticated;

-- Lectura pública: el grupo en sí no revela nada; la visibilidad de cada place la sigue
-- filtrando la policy de places al resolver los miembros.
DROP POLICY IF EXISTS "place_relationships: anyone can read" ON public.place_relationships;
CREATE POLICY "place_relationships: anyone can read"
  ON public.place_relationships FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "place_relationship_members: anyone can read" ON public.place_relationship_members;
CREATE POLICY "place_relationship_members: anyone can read"
  ON public.place_relationship_members FOR SELECT TO anon, authenticated USING (true);
```

Escritura staff-only en ambas tablas (`is_staff_profile()`), con `FOR INSERT/UPDATE/DELETE`
espejando 057. Ver §6 O4 antes de cerrar esto: si los contributors van a poder proponer
relaciones, la policy cambia.

### 3.2 `database.types.ts`

Es **hand-maintained** (`npm run gen:types` necesita Supabase local). Agregar las dos tablas
(Row/Insert/Update/Relationships) en el mismo cambio que el `.sql`.

---

## 4. Capa de código (respetando `.cursor/rules/fiktionmaps-architecture.mdc`)

Módulo nuevo `src/place-relationships/`, en vez de engordar `src/places/`, porque tiene su propio
puerto y su propio ciclo de vida.

### 4.1 `domain/`

- `place-relationship.entity.ts`
  ```ts
  export type PlaceRelationshipType = "shared" | "composite"

  export interface PlaceRelationship {
    id: string
    type: PlaceRelationshipType
    name: string
    slug: string
  }

  /** Un grupo con sus places ya resueltos, listo para la ficha de place. */
  export interface PlaceRelationshipWithMembers extends PlaceRelationship {
    members: Place[]
  }
  ```
- `place-relationship.schemas.ts`: Zod de dominio (`createPlaceRelationshipSchema`,
  `addPlaceRelationshipMemberSchema`).
- `place-relationship.repository.ts` (puerto):
  ```ts
  listForPlace(placeId: string): Promise<PlaceRelationshipWithMembers[]>
  getById(id: string): Promise<PlaceRelationshipWithMembers | null>
  create(data: CreatePlaceRelationshipData): Promise<PlaceRelationship | null>
  addMember(data: AddMemberData): Promise<boolean>
  removeMember(relationshipId: string, placeId: string): Promise<boolean>
  ```

### 4.2 `infrastructure/supabase/place-relationship.repository.impl.ts`

Único sitio con `supabase.from("place_relationships" | "place_relationship_members")`.

`listForPlace` en dos pasos (PostgREST trunca el embed cuando se filtra sobre la tabla
embebida): primero los `place_relationship_id` del place, después los grupos con **todos** sus
miembros vía `.in("id", ids)`.

Mapear el error `23505` a un error de dominio distinguible ("ya pertenece a un grupo de ese
tipo") — es el caso esperado de los índices únicos parciales, y llega también cuando el place ya
está en **otro** grupo del mismo tipo, no solo en este.

### 4.3 `application/`

- `get-place-relationships.usecase.ts` — para la ficha de place.
- `create-place-relationship.usecase.ts` — crea el grupo y agrega los N miembros iniciales.
- `add-place-relationship-member.usecase.ts`
- `remove-place-relationship-member.usecase.ts` — ver O5 (grupo con 0/1 miembros).

### 4.4 `infrastructure/next/`

- `place-relationship.queries.ts`: `getPlaceRelationshipsCached(placeId)` con tag
  `place-${placeId}` (ya se usa en `place.queries.ts`), para que la ficha invalide junto al place.
- `place-relationship.actions.ts`: create / addMember / removeMember → use case →
  `updateTag("places")` + `updateTag(\`place-${id}\`)` de **todos** los places del grupo, no solo
  del editado; si no, la ficha de los otros miembros queda stale.
- `place-relationship.actions.types.ts` para los `{ success, error }`.

---

## 5. UI

**v1 (admin/staff):** pestaña o panel en el admin de place para crear un grupo, buscar places y
adjuntarlos/quitarlos, mostrando el tipo. Reusar el buscador de places de `scenes-tab.tsx`.

**v1 (público):** en la ficha de place, una sección por grupo:
- `shared` → "También aparece en" (listar por ficción).
- `composite` → "Otros puntos de este lugar" (usar `shoot_environment` para etiquetar
  interior/exterior; ya existe, no hace falta columna nueva).

**Fuera de v1:** comportamiento del mapa (colapsar un `composite` bajo un pin), y detección
automática de candidatos.

---

## 6. Decisiones abiertas

- **O1 — Nombres de los tipos.** `shared` / `composite` no dicen qué se comparte ni qué se
  compone. Alternativas: `same_place` / `venue`, o `location` / `venue`. Decidir antes de la
  migración: cambiar el CHECK después obliga a migrar datos.
- **O2 — ¿`name` es obligatorio en `shared`?** Para `composite` es información real ("Grand
  Budapest Hotel"). Para `shared` sería el nombre del lugar real, que probablemente duplica
  `locations.name` de los miembros. Opciones: exigirlo igual (arriba está `NOT NULL`), o
  permitir null y derivar el label del primer miembro.
- **O3 — ¿Restringir la ficción de los miembros?** Un `composite` es un venue de **una** ficción y
  un `shared` cruza ficciones por definición. Se puede enforcar con trigger (como
  `scene_places_place_matches_scene_fiction`) o dejarlo como convención editorial. Enforcarlo
  cierra la puerta a un venue que aparezca en una secuela.
- **O4 — ¿Quién escribe?** §3.1 asume staff-only. Si los contributors proponen relaciones, hace
  falta un `status` en el grupo y entra en el flujo de `contributions`.
- **O5 — Grupo huérfano.** Un grupo con 1 miembro no significa nada y con 0 es basura. ¿Borrado en
  cascada al sacar el último miembro (trigger), o limpieza periódica? Un CHECK no sirve: el primer
  miembro se inserta después del grupo.
- **O6 — ¿Nivel `place` o `location`?** Este plan agrupa places, siguiendo la propuesta. Agrupar
  `locations` sería semánticamente más limpio para `shared` (es una afirmación sobre geografía,
  no sobre ficción) y los grupos se achicarían solos si se implementa §1.2. Hoy, con 1:1 entre
  place y location, la cardinalidad es idéntica, así que la diferencia es solo semántica. Si se
  hace §1.2 primero, conviene revisar esta decisión.

---

## 7. Orden

1. Cerrar O1–O6 (mínimo O1 y O5, que afectan el DDL).
2. `072_place_relationships.sql` + `database.types.ts`. Gate: el usuario la aplica en local y
   verifica los únicos parciales a mano (insertar `p1` en dos `composite` debe fallar; en un
   `shared` + un `composite` debe pasar).
3. Dominio + puerto + adapter + use cases. Gate: `tsc` y `lint` verdes.
4. Actions/queries + admin UI. Gate: crear un grupo y adjuntar 2 places end-to-end.
5. Secciones públicas en la ficha de place.
6. Wrap-up: mover el modelo a `docs/reference/` (extender la doc de places/locations), borrar este
   plan y `2026-07-26-place-relations.md`.

El plan separado de §1.2 (reuso de location en el wizard) conviene arrancarlo antes o en paralelo:
sin eso, cada ficción nueva de un landmark popular es una curación manual.
