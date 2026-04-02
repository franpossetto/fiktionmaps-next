# Architecture: modules, layers, and entry points

This document is the explicit reference for implementing **new modules** without mixing hierarchies or vocabulary. Anyone adding a feature should follow it.

---

## 1. Fixed vocabulary (do not conflate terms)

| Term | Meaning |
|------|---------|
| **Domain** | Core model and business rules. Only files such as `*.domain.ts` and use-case logic that does **not** depend on Next.js or Supabase. Lives under **`src/<module>/`**. |
| **Repository (contract)** | Interface in `*.repository.port.ts`: which persistence operations exist. |
| **Repository (implementation)** | Code in `*.repository.adapter.ts` that **implements** the port using Supabase (or another backend). |
| **Service** | Use cases in `*.services.ts`: orchestration and rules; depends on the **port**, not the concrete adapter. |
| **DTO / schema** | Input/output shapes and validation (`*.dtos.ts`, `*.schemas.ts`). **Not** a “layer under domain” in the pyramid; they are the **edge** of the use case. |
| **Application composition** | **`lib/server/`**: instances, Supabase clients, which adapter is injected. **Not** domain. |
| **Cached reads (RSC)** | **`lib/server/queries/`**: only `unstable_cache` / `cache` wrappers around functions already defined in composition. **Not** domain. |
| **Server actions** | **`lib/actions/<feature>/*.actions.ts`**: functions with `"use server"` that call **`@/lib/server`** (or domain types). **Not** domain. |
| **Framework entry** | **`app/`** (routes, pages, `route.ts`). **Not** domain layers; they are **doors** where traffic enters. |

**Rule:** “Domain” names only the core. **`lib/server`** is **not** a synonym for domain. **`lib/`** as a whole is **not** domain: it is the **application shell** next to Next.js (composition, actions, clients, shared UI helpers).

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

## 4. Composition (`lib/server`): what it is and what it is not

- **It is** where the system is **wired**: `createXSupabaseAdapter(...)`, `createXService({ repo: ... })`, **session** vs **anonymous** client as required.
- **It is not** another step inside the domain pyramid domain → repository → service. It **imports** domain code and adapters already written and **exports** functions ready for `app/`, **`lib/actions/`**, and API routes.

Typical files:

- `lib/server/<module>.ts` — wiring for that context.
- `lib/server/anon-repos.ts` — read-only repos with the anonymous client (safe inside `unstable_cache`). **One global file**, not necessarily one per entity.
- `lib/server/queries/<module>.ts` — cached reads for RSC only; they call “uncached” functions defined in the same module’s composition file.
- `lib/server/index.ts` — re-exports what the app should use (`@/lib/server`).

**Important:** files under `lib/server/queries/` should import composition from paths like `@/lib/server/<module>` (not from the barrel `index.ts`) to **avoid circular dependencies**.

### 4.1. Layout of `lib/` (application shell)

Domain modules live in **`src/<module>/`**. Everything under **`lib/`** is **outside** that pyramid: shared clients, composition, server actions, validation helpers, etc.

| Path | Role |
|------|------|
| **`lib/server/`** | Application composition (see §4). |
| **`lib/server/queries/`** | Cached reads for RSC (`unstable_cache`). |
| **`lib/actions/<feature>/`** | Server actions (`"use server"`); import **`@/lib/server`**, not adapters directly. |
| **`lib/supabase/`** | Browser and server Supabase clients. |
| **`lib/validation/`** | Shared parsers, HTTP helpers, primitives used at edges. |
| **`lib/constants/`**, **`lib/map/`**, **`lib/asset-*`**, etc. | Product constants, map UI, asset pipelines — **not** domain modules; keep them free of business rules that belong in `src/`. |

**`lib/utils`:** use for small shared helpers that do not deserve their own folder; avoid dumping domain logic there.

---

## 5. Framework entry points (several doors, same logic behind)

There is no single URL “for domain”. There are **several entry kinds** because the product needs them:

| Entry | When |
|-------|------|
| `app/**/page.tsx` (RSC) | Navigation: HTML, data for render, metadata. |
| `app/api/**/route.ts` | Explicit HTTP (REST, webhooks, non-React clients). |
| `lib/actions/**/**.actions.ts` (`"use server"`) | Mutations from the client (forms, buttons) without hand-written REST routes. |

Pages and routes import **`@/lib/server`** (or **`@/lib/server/queries`** for cached reads) or call **server actions** that delegate to **`@/lib/server`**.  
None of these **is** the domain: domain lives under **`src/<module>/`**, not under `app/` or `lib/`.

---

## 6. Checklist: new module (recommended order)

1. **`src/<name>/<name>.domain.ts`** — entities / model types.
2. **`src/<name>/<name>.dtos.ts`** and, if needed, **`*.schemas.ts`** — input/output contracts.
3. **`src/<name>/<name>.repository.port.ts`** — repository interface (references domain types).
4. **`src/<name>/<name>.repository.adapter.ts`** — Supabase implementation; imports `lib/supabase/server.ts` as needed.
5. **`src/<name>/<name>.services.ts`** — use cases; depends only on the **port** (injection in the next step).
6. **`lib/server/<name>.ts`** — build adapters + `createXService`, export functions for mutations and reads **without** `unstable_cache` here (unless you explicitly choose otherwise).
7. If you need public cached reads for RSC: **`lib/server/queries/<name>.ts`** + exports in **`lib/server/queries/index.ts`** and **`lib/server/index.ts`**.
8. **Server actions** in **`lib/actions/<feature>/*.actions.ts`**, and/or routes under **`app/`**, importing **`@/lib/server`**.

---

## 7. Anti-patterns

- Comments inside `*.repository.port.ts` or `*.repository.adapter.ts` (keep those files free of explanatory prose; names and structure should suffice).
- Putting core business logic **only** in `lib/server` without going through the module’s **services**.
- Treating “domain” and “composition” as the same layer in prose or code.
- Making `*.domain.ts` import DTOs or adapters.
- Importing `*.repository.adapter` from **pages** or **components**; the app should go through **`@/lib/server`** or **server actions**, not couple to the adapter.
- Using `unstable_cache` inside the **adapter**; framework caching belongs in **`lib/server/queries`**.
- Placing **`"use server"`** action files inside **`src/`**; they belong under **`lib/actions/`** (domain stays framework-agnostic).

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
lib/server (+ queries)     =  composition and RSC cache
lib/actions/<feature>/     =  server actions → @/lib/server

app/  →  import  →  @/lib/server  or  lib/actions  →  …  →  services / repos / domain
```

---

*Aligned with **`fiktionmaps/src/`** (domain) and **`fiktionmaps/lib/`** (application shell: `server`, `actions`, clients, shared helpers).*
