# Plan: eliminar `lib/modules` y usar solo `modules/`

## Situación actual

- **`lib/modules/`**: capa antigua con tipos (`.model`), repos (interfaces + mock + api), servicios. Datos mock o API externa. Usada por:
  - **`lib/api/`**: `registry.ts` crea servicios (mock o api) y `types.ts` define `ApiServices` / `Repositories`.
  - **Componentes**: importan tipos (`City`, `Fiction`, `Location`, `Scene`, `UserProfile`, `CheckIn`) y usan `useApi()` para datos.
  - **`modules/fictions/fiction.services.ts`**: importa `City` y `Location` desde `lib/modules` para tipos.

- **`modules/`**: capa nueva con dominio, puertos, adaptadores Supabase y servicios. Solo existen:
  - **cities** (domain, services, repository adapter, dtos)
  - **fictions** (domain, services, repository adapter, dtos)
  - **users** (domain, services, repository adapter, dtos)

- **Supabase**: tablas hoy son `profiles`, `fictions`, `cities`. No hay tablas `locations` ni `scenes`.

---

## Qué tienen que ofrecer los `modules/` para reemplazar `lib/modules`

### 1. Tipos públicos (dominio) alineados

Los consumidores hoy usan los tipos de `lib/modules`. Hay que poder importar desde `modules/` (o un barrel) y que la forma sea compatible donde importa solo tipo:

| Tipo actual (lib/modules) | Dónde reemplazarlo | Notas |
|--------------------------|--------------------|--------|
| `City` | `modules/cities/city.domain` | Ya existe; tiene `created_at`/`updated_at` extra. Componentes que solo leen pueden usarlo. |
| `Fiction` | `modules/fictions/fiction.domain` | Ya existe; en lib es `synopsis`/`coverImage`/`bannerImage`, en modules es `description` y sin imágenes. Habrá que unificar nombres/campos o mapear en adaptador. |
| `Location` | **No existe en modules** | Crear `modules/locations/` con al menos `location.domain.ts` (y luego repo cuando exista tabla). |
| `Scene` | **No existe en modules** | Crear `modules/scenes/` con al menos `scene.domain.ts` (y luego repo cuando exista tabla). |
| `UserProfile` / `CheckIn` | `modules/users` | En modules está `Profile` (Supabase); en lib hay `UserProfile` + `CheckIn` (intereses, visitas, check-ins). Decidir si extendemos dominio de users o mantenemos DTOs/vistas para UI. |

**Necesidad mínima para eliminar imports de tipos desde lib/modules:**

- Reexportar desde un solo sitio (p. ej. `app-services` o `modules/index`) los tipos que usan los componentes: `City`, `Fiction`, `Location`, `Scene`, y el tipo de perfil/check-in que use la UI.
- Para **Location** y **Scene**: definir interfaces en `modules/locations/location.domain.ts` y `modules/scenes/scene.domain.ts` (aunque aún no tengan repo Supabase), para que todo el mundo importe de `modules/` y no de `lib/modules`.

### 2. Servicios / API que hoy da `useApi()`

Hoy `lib/api/registry` construye un objeto `ApiServices` con:

- `cities`: getAll, getById, getCityFictions
- `fictions`: getAll, getById, etc.
- `locations`: getAll, getById, getByCityId, getByFictionId, getFiltered
- `scenes`: getAll, getByLocationId, getByFictionId
- `users`: lo que exponga `UserService` de lib/modules

Para reemplazar eso sin `lib/modules`:

- **Cities**: `modules/cities` ya tiene `getAll`, `getById`, `getCityFictions` vía `createCitiesService`. Falta exponerlos en la “API unificada” (ver abajo).
- **Fictions**: igual con `modules/fictions`.
- **Users**: `modules/users` ya tiene perfil; hay que ver si hace falta algo más (ej. check-ins) y exponerlo.
- **Locations / Scenes**: no hay módulos ni tablas. Opciones:
  - **A)** Crear `modules/locations` y `modules/scenes` con dominio + (por ahora) un adaptador que use mock o API externa; el registry nuevo los instancia.
  - **B)** Mantener un único “LocationService” y “SceneService” fuera de lib/modules (p. ej. en `lib/api/` o en un solo archivo) que por ahora use mock/datos fijos, pero que usen tipos de `modules/locations` y `modules/scenes`. Así se elimina todo `lib/modules` y luego se puede mover esa lógica a modules cuando exista DB.

### 3. Interfaz unificada para componentes (reemplazo de `useApi()`)

Los componentes esperan algo como:

```ts
const { cities, fictions, locations, scenes, users } = useApi()
// y luego cities.getAll(), locations.getByCityId(...), etc.
```

Para no tocar todos los componentes a la vez, hace falta una capa que:

- Siga exponiendo la misma forma de `ApiServices` (mismos nombres y métodos), **o**
- Se cambie a una API nueva (p. ej. `useAppServices()`) y se migren todos los usos de `useApi()` en un solo paso.

Recomendación: **nuevo registry (o ampliación de app-services) que construya el objeto que hoy es `ApiServices`** usando:

- cities → `createCitiesService` de `modules/cities` (con adaptador Supabase y opcionalmente locationsRepo/ fictionsRepo para getCityFictions).
- fictions → `createFictionsService` de `modules/fictions`.
- users → servicios de `modules/users` (perfil, etc.).
- locations / scenes → por ahora implementaciones mínimas (mock o API) que cumplan la interfaz actual y usen tipos de `modules/locations` y `modules/scenes`.

Así `lib/api/types.ts` puede dejar de importar de `lib/modules` y pasar a definir solo las interfaces de servicio (o importarlas de `modules/` donde existan).

---

## Pasos concretos (orden sugerido)

### Fase 1: Tipos y módulos mínimos para Location/Scene

1. **Crear `modules/locations/`**
   - `location.domain.ts`: interface `Location` (misma forma que la de lib/modules o la que quieras para la app).
   - Opcional: `location.repository.port.ts` y un adaptador mock que implemente ese puerto (para poder inyectar en un futuro LocationService).

2. **Crear `modules/scenes/`**
   - `scene.domain.ts`: interface `Scene`.
   - Opcional: puerto + adaptador mock.

3. **Unificar Fiction**
   - Revisar diferencias entre `lib/modules/fictions/fiction.model` y `modules/fictions/fiction.domain` (synopsis vs description, imágenes, etc.). Decidir un único modelo; si la DB no tiene campos, mapear en adaptador o extender migraciones.

4. **Unificar User/Profile**
   - Decidir si `UserProfile` y `CheckIn` de la UI viven en `modules/users` (domain o dtos) o en un tipo “vista” que se construye desde `Profile` y otras tablas. Exportar desde `modules/users` lo que los componentes necesiten.

### Fase 2: Nuevo “registry” sin lib/modules

5. **Definir interfaces de “servicios de app”**
   - En `lib/api/types.ts` (o en un tipo compartido), definir la forma de `cities`, `fictions`, `locations`, `scenes`, `users` que consumen los componentes, **sin** importar nada de `lib/modules`.

6. **Implementar creación de servicios**
   - En `lib/api/registry.ts` (o en `app-services`):
     - Cities: `createCitiesService` de `modules/cities` con adaptador Supabase; si hace falta getCityFictions, inyectar algo que dé locations por city y fictions (por ahora puede ser mock o vacío).
     - Fictions: `createFictionsService` de `modules/fictions`.
     - Users: lo que ya tengas en `modules/users` (perfil, etc.) expuesto con la misma “forma” que hoy.
     - Locations / Scenes: instanciar servicios que implementen la interfaz actual (getAll, getById, getByCityId, …) usando implementaciones mock o en `modules/locations` y `modules/scenes` con adaptador mock.

7. **Apuntar tipos a modules**
   - En `lib/api/types.ts`, reemplazar imports de `lib/modules/*` por tipos de `modules/*` (y por los nuevos `modules/locations`, `modules/scenes`).

### Fase 3: Migrar imports de tipos

8. **Reemplazar imports de tipos en componentes**
   - Buscar todos los `from "@/lib/modules/cities"` (y fictions, locations, scenes, users) y cambiar a `from "@/modules/..."` (o al barrel que definas, p. ej. `@/lib/app-services` si reexportas tipos ahí).
   - Ajustar nombres de tipo si cambiaste algo (ej. `Profile` vs `UserProfile`).

9. **Arreglar referencias internas**
   - `modules/fictions/fiction.services.ts` ya importa de `lib/modules/cities/city.model` y `lib/modules/locations/location.model`: cambiar a `modules/cities/city.domain` y `modules/locations/location.domain`.

### Fase 4: Dejar de usar lib/modules en lib/api

10. **Registry y provider**
    - Asegurar que `createServices()` (o el equivalente) solo use `modules/` y las implementaciones mock de locations/scenes. Nada de `lib/modules`.

11. **Eliminar lib/modules**
    - Borrar la carpeta `lib/modules` por completo.

12. **Limpieza**
    - Quitar imports rotos, ajustar tests, y si algo en `lib/api` quedó vacío o redundante, unificar en `app-services` o dejar un único punto de entrada para “servicios de app” (useApi / useAppServices).

---

## Resumen: qué necesitan los otros `modules/` para reemplazar lib/modules

| Necesidad | Cities | Fictions | Users | Locations | Scenes |
|-----------|--------|----------|-------|-----------|--------|
| Tipo público (domain) | ✅ Ya existe | ✅ Existe; alinear con UI | ✅ Profile existe; decidir UserProfile/CheckIn | Crear domain | Crear domain |
| Servicio (getAll, getById, …) | ✅ Ya en app-services | ✅ Ya en app-services | ✅ Perfil en app-services | Crear servicio + repo mock (o adapter) | Crear servicio + repo mock (o adapter) |
| Consumido por lib/api / useApi | Sí, vía nuevo registry | Sí | Sí | Sí (mock hasta tener DB) | Sí (mock hasta tener DB) |

Cuando existan tablas `locations` y `scenes` en Supabase, se añaden adaptadores en `modules/locations` y `modules/scenes` y se cambia el registry para usarlos en lugar del mock; el resto de la app ya dependerá solo de `modules/` y del registry/app-services.
