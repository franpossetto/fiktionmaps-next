# Architecture: modules, layers, and entry points

This document is the explicit reference for implementing **new modules** without mixing hierarchies or vocabulary. Anyone adding a feature should follow it.

---

## 1. Fixed vocabulary (do not conflate terms)

| Term | Meaning |
|------|---------|
| **Domain** | Core model and business rules. Only files such as `*.domain.ts` and use-case logic that does **not** depend on Next.js or Supabase. |
| **Repository (contract)** | Interface in `*.repository.port.ts`: which persistence operations exist. |
| **Repository (implementation)** | Code in `*.repository.adapter.ts` that **implements** the port using Supabase (or another backend). |
| **Service** | Use cases in `*.services.ts`: orchestration and rules; depends on the **port**, not the concrete adapter. |
| **DTO / schema** | Input/output shapes and validation (`*.dtos.ts`, `*.schemas.ts`). **Not** a “layer under domain” in the pyramid; they are the **edge** of the use case. |
| **Application composition** | `src/server/`: instances, Supabase clients, which adapter is injected. **Not** domain. |
| **Cached reads (RSC)** | `src/server/queries/`: only `unstable_cache` / `cache` wrappers around functions already defined in composition. **Not** domain. |
| **Framework entry** | `app/` (routes, pages, `route.ts`) and `*.actions.ts` with `"use server"`. **Not** domain layers; they are **doors** where traffic enters. |

**Rule:** “Domain” names only the core. `src/server` is **not** a synonym for domain.

---

## 2. A single hierarchy: domain

Dependencies point **inward** toward the domain (domain does not import services or adapters).

```
*.services.ts              →  uses  →  *.repository.port.ts
*.repository.port.ts       →  types with  →  *.domain.ts

*.repository.adapter.ts    →  implements  →  *.repository.port.ts
*.repository.adapter.ts    →  uses types from  →  *.domain.ts
```

- The **service** knows the repository **interface**, not the implementation.
- The **adapter** implements the port and talks to Supabase via `lib/supabase/server.ts`.

**DTOs:** the **service** may take or return DTOs in its signatures. **Domain** does **not** depend on DTOs.

---

## 3. Infrastructure (concrete persistence)

```
*.repository.adapter.ts  →  lib/supabase/server.ts  →  Supabase
```

This is **infrastructure**, not domain.

---

## 4. Composition (`src/server`): what it is and what it is not

- **It is** where the system is **wired**: `createXSupabaseAdapter(...)`, `createXService({ repo: ... })`, **session** vs **anonymous** client as required.
- **It is not** another step inside the domain pyramid domain → repository → service. It **imports** domain code and adapters already written and **exports** functions ready for `app/` and actions.

Typical files:

- `src/server/<module>.ts` — wiring for that context.
- `src/server/anon-repos.ts` — read-only repos with the anonymous client (safe inside `unstable_cache`). **One global file**, not necessarily one per entity.
- `src/server/queries/<module>.ts` — cached reads for RSC only; they call “uncached” functions defined in the same module’s composition file.
- `src/server/index.ts` — re-exports what the app should use (`@/src/server`).

**Important:** files under `src/server/queries/` should import composition from paths like `@/src/server/<module>` (not from the barrel `index.ts`) to **avoid circular dependencies**.

---

## 5. Framework entry points (several doors, same logic behind)

There is no single URL “for domain”. There are **several entry kinds** because the product needs them:

| Entry | When |
|-------|------|
| `app/**/page.tsx` (RSC) | Navigation: HTML, data for render, metadata. |
| `app/api/**/route.ts` | Explicit HTTP (REST, webhooks, non-React clients). |
| `*.actions.ts` (`"use server"`) | Mutations from the client (forms, buttons) without hand-written REST routes. |

All of these may import `@/src/server` (or domain types where appropriate).  
None of them **is** the domain: domain lives under `src/<module>/`, not under `app/`.

---

## 6. Checklist: new module (recommended order)

1. **`src/<name>/<name>.domain.ts`** — entities / model types.
2. **`src/<name>/<name>.dtos.ts`** and, if needed, **`*.schemas.ts`** — input/output contracts.
3. **`src/<name>/<name>.repository.port.ts`** — repository interface (references domain types).
4. **`src/<name>/<name>.repository.adapter.ts`** — Supabase implementation; imports `lib/supabase/server.ts` as needed.
5. **`src/<name>/<name>.services.ts`** — use cases; depends only on the **port** (injection in the next step).
6. **`src/server/<name>.ts`** — build adapters + `createXService`, export functions for mutations and reads **without** `unstable_cache` here (unless you explicitly choose otherwise).
7. If you need public cached reads for RSC: **`src/server/queries/<name>.ts`** + exports in **`src/server/queries/index.ts`** and **`src/server/index.ts`**.
8. **Server actions** in `src/<name>/<name>.actions.ts` or equivalent, and/or routes under **`app/`**, importing **`@/src/server`**.

---

## 7. Anti-patterns

- Putting core business logic **only** in `src/server` without going through the module’s **services**.
- Treating “domain” and “composition” as the same layer in prose or code.
- Making `*.domain.ts` import DTOs or adapters.
- Importing `*.repository.adapter` from **pages** or **components**; the app should go through **`@/src/server`** or actions, not couple to the adapter.
- Using `unstable_cache` inside the **adapter**; framework caching belongs in **`src/server/queries`**.

---

## 8. Summary diagram (three blocks, do not merge)

**Domain (one pyramid):**

```
service  →  repository.port  →  domain
                ↑
         repository.adapter (implements the port)
```

**Infrastructure:**

```
repository.adapter  →  lib/supabase/server.ts
```

**Composition and entries (not domain):**

```
src/server (+ queries)  =  composition and RSC cache

app/  and  *.actions.ts  →  import  →  @/src/server  →  …  →  services / repos / domain
```

---

*Aligned with `fiktionmaps/src/` and `fiktionmaps/src/server/`.*
