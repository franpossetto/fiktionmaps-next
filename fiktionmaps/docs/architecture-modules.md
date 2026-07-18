# Architecture: modules, layers, and entry points

Single source of truth for implementing features in FiktionMaps. Aligned with `src/` layout and `.cursor/rules/fiktionmaps-architecture.mdc`.

---

## 1. Vocabulary

| Term | Meaning |
|------|---------|
| **Domain** | Entities, value types, repository ports, domain Zod. Lives in `src/<feature>/domain/`. No Next.js, no Supabase imports. |
| **Use case** | One application operation in `src/<feature>/application/*.usecase.ts`. Orchestrates ports; receives repos by parameter. |
| **Repository (port)** | Interface in `domain/<feature>.repository.ts`. |
| **Repository (impl)** | Supabase adapter in `infrastructure/supabase/<feature>.repository.impl.ts`. **Only** place for `supabase.from(...)` on business tables. |
| **Queries** | `infrastructure/next/<feature>.queries.ts` — cached reads for Server Components (`unstable_cache`, React `cache`). |
| **Actions** | `infrastructure/next/<feature>.actions.ts` — `"use server"` mutations; validate → use case → `revalidateTag` / `revalidatePath`. |
| **Action DTO** | UI/Next result types (`CreateXResult`, `{ success, error }`) next to actions or in `*.actions.types.ts`. **Not** in `domain/*.schemas.ts`. |

**`lib/`** is the application shell (Supabase clients, map, validation, assets) — **not** domain. **`app/`** and **`components/`** are framework/UI entry points.

---

## 2. Dependency direction

```
usecase  →  repository port  →  entity / schemas
                ↑
         repository impl (Supabase)
```

- Domain never imports application or infrastructure.
- Application never imports `@/lib/supabase/server` or Next.js cache APIs.
- Pages/components import `infrastructure/next/*.queries` or call server actions — not repository impls directly.

---

## 3. Fixed flow per business operation

1. **domain/** — port, entities, Zod.
2. **infrastructure/supabase/** — adapter + mappers.
3. **application/** — use case.
4. **infrastructure/next/** — action or query at the edge.

Several entry points (e.g. two actions) may reuse the **same** use case when it is the same application operation.

### Edge exceptions (infrastructure/next only)

- `createClient()` for **`auth.getUser()`** / session checks.
- Construct repo adapters **only** to inject as deps into use cases (composition root). No repo method calls or business logic in actions/queries.

---

## 4. Layout

```
src/<feature>/
├── domain/
│   ├── <feature>.entity.ts
│   ├── <feature>.repository.ts
│   ├── <feature>.dtos.ts          # optional
│   └── <feature>.schemas.ts       # optional (domain Zod)
├── application/
│   └── <action>-<feature>.usecase.ts
└── infrastructure/
    ├── supabase/
    │   └── <feature>.repository.impl.ts
    └── next/
        ├── <feature>.queries.ts
        └── <feature>.actions.ts

src/shared/
├── domain/
└── infrastructure/next/
    ├── cache.config.ts
    └── cache.keys.ts

lib/                    # not domain — clients, map, validation, assets
app/                    # routes, pages
components/             # React UI
```

---

## 5. Caching rules

| Mechanism | Where | Purpose |
|-----------|-------|---------|
| React `cache()` | Read methods in repository impl | Request-scoped dedupe |
| `unstable_cache` | `infrastructure/next/*.queries.ts` only | Cross-request RSC cache |
| `revalidateTag` / `revalidatePath` | After mutations in actions | Invalidate stale cache |

- Never put `unstable_cache` inside repository impl.
- User-specific data: include `userId` in the cache key.

---

## 6. Checklist: new feature

1. `domain/<feature>.entity.ts` — types.
2. `domain/<feature>.repository.ts` — port.
3. `domain/<feature>.schemas.ts` — Zod if needed.
4. `infrastructure/supabase/<feature>.repository.impl.ts` — Supabase; `cache()` on reads.
5. `application/<action>-<feature>.usecase.ts` — one operation per file.
6. `infrastructure/next/<feature>.queries.ts` — cached reads calling use cases.
7. `infrastructure/next/<feature>.actions.ts` — mutations calling use cases.
8. Wire pages/components to queries/actions (not repo directly).
9. Add cache keys to `src/shared/infrastructure/next/cache.keys.ts` if needed.

**When to skip a use case:** pure pass-through reads with no rules can call the repo from the query — but prefer a thin use case for consistency when touching the module.

---

## 7. Anti-patterns

- `supabase.from(...)` in `infrastructure/next` (except `auth.getUser()`).
- Calling `repo.getById()` / `repo.create()` directly from actions or queries.
- Business logic duplicated in actions/queries instead of use cases.
- `unstable_cache` inside repository impl.
- Mixing action result DTOs into `domain/*.schemas.ts`.
- Importing repository impl from pages or components.
- Legacy `lib/server/` composition for **new** features — use `src/<feature>/infrastructure/next/` instead.

When editing legacy code that still bypasses use cases, migrate to the flow above in the same change; do not add new shortcuts.

---

## 8. Summary diagram

```
app/page.tsx  →  infrastructure/next/*.queries.ts  →  usecase  →  repo port
                                                      ↑
client component  →  *.actions.ts  →  usecase  →  repo impl  →  Supabase
```

---

*See also `fiktionmaps/src/README.md` for a short module-oriented overview.*
