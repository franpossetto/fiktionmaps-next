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
Naming map — current → target
CurrentTarget{feature}.domain.tsdomain/{feature}.entity.ts{feature}.dtos.tsmerged into domain/{feature}.entity.ts{feature}.repository.port.tsdomain/{feature}.repository.ts{feature}.repository.adapter.tsinfrastructure/supabase/{feature}.repository.impl.ts{feature}.services.tsapplication/{action}-{feature}.usecase.ts (split by action)index.tsremoved — no barrel exportsapp/api/{feature}/route.tsremoved — replaced by infrastructure/next/{feature}.queries.ts and infrastructure/next/{feature}.actions.ts

Target structure per feature
src/
└── {feature}/
    ├── domain/
    │   ├── {feature}.entity.ts        ← types + DTOs (merged from domain + dtos)
    │   └── {feature}.repository.ts    ← interface (from repository.port)
    ├── infrastructure/
    │   ├── supabase/
    │   │   └── {feature}.repository.impl.ts   ← Supabase adapter (from repository.adapter)
    │   └── next/
    │       ├── {feature}.queries.ts   ← cached reads for Server Components
    │       └── {feature}.actions.ts   ← Server Actions for Client Components
    └── application/
        └── {action}-{feature}.usecase.ts  ← split from services.ts, only if business logic

Shared files to create
Create these if they don't exist:
src/shared/domain/base.entity.ts
tsexport type BaseEntity = {
  id: string
  createdAt: string
  updatedAt: string
}
src/shared/infrastructure/db/client.ts
tsimport { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export function getSupabaseServer() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name) => cookieStore.get(name)?.value } }
  )
}
src/shared/infrastructure/next/cache.config.ts
tsexport const CacheConfig = {
  short:  { revalidate: 60 },
  medium: { revalidate: 60 * 10 },
  long:   { revalidate: 60 * 60 },
  static: { revalidate: false },
} as const
src/shared/infrastructure/next/cache.keys.ts
tsexport const CacheKeys = {
  checkin:   (id: string) => ["checkin", id],
  city:      (id: string) => ["city", id],
  fiction:   (id: string) => ["fiction", id],
  interest:  (id: string) => ["interest", id],
  location:  (id: string) => ["location", id],
  place:     (id: string) => ["place", id],
  scene:     (id: string) => ["scene", id],
  user:      (id: string) => ["user", id],
} as const

Migration steps — do them in this order
Step 1 — Create shared/
Create the four shared files listed above.
Step 2 — Migrate one feature at a time
Start with the simplest feature (recommend: cities or interests).
For each feature:

Create domain/{feature}.entity.ts

Copy types from {feature}.domain.ts
Merge DTOs from {feature}.dtos.ts into the same file
Extend BaseEntity for the main type


Create domain/{feature}.repository.ts

Copy the interface from {feature}.repository.port.ts
Update imports to point to the new entity file


Create infrastructure/supabase/{feature}.repository.impl.ts

Copy implementation from {feature}.repository.adapter.ts
Add cache() from React to all read methods
Remove cache() from write methods
Update import to use getSupabaseServer() from @/shared/infrastructure/db/client


Analyze {feature}.services.ts

For each method, decide: does it have real business logic?
If yes → create application/{action}-{feature}.usecase.ts
If no (simple fetch or pass-through) → skip, call repo directly from queries


Create infrastructure/next/{feature}.queries.ts

One export per read operation
Wrap with unstable_cache using CacheKeys and CacheConfig
Call use-case if it exists, otherwise call repo directly


Create infrastructure/next/{feature}.actions.ts

Add "use server" at the top
One export per write operation
Call revalidateTag after every mutation


Update app/ pages that used the old imports

Replace imports from @/src/{feature} with @/{feature}/infrastructure/next/{feature}.queries
Replace API calls with direct function calls (no more fetch('/api/{feature}'))


Delete old files

{feature}.domain.ts
{feature}.dtos.ts
{feature}.repository.port.ts
{feature}.repository.adapter.ts
{feature}.services.ts
index.ts


Add cache key to shared/infrastructure/next/cache.keys.ts if not already there

Step 3 — Remove API routes
After all features are migrated, the app/api/ folder should be empty or removed.
Server Components call queries.ts directly — no HTTP layer needed.
Step 4 — Verify
For each migrated feature, verify:

 No imports from infrastructure/ inside application/
 No imports from application/ or infrastructure/ inside domain/
 cache() React only on read methods in repository impl
 unstable_cache only in queries.ts
 "use server" only in actions.ts
 revalidateTag called after every mutation in actions.ts
 Pages import from infrastructure/next/ only, not from Supabase directly


Important decisions during migration
When splitting services.ts into use-cases
Keep as use-case (real business logic):
ts// services.ts has this → extract to use-case
if (!fiction) throw new Error("Fiction not found")
if (fiction.status === "draft") throw new Error("Not published")
await notifyFollowers(fiction.id)
Skip use-case (pass-through):
ts// services.ts has this → call repo directly from queries.ts
return this.repository.findById(id)
When handling app/api/ routes
Most routes are just a wrapper around a service call:
ts// current: app/api/fictions/route.ts
export async function GET() {
  const fictions = await fictionsService.getAll()
  return Response.json(fictions)
}
Replace with a direct call in the Server Component:
ts// target: fictions/infrastructure/next/fiction.queries.ts
export function getFictionsCached() {
  return unstable_cache(
    () => repo.getAll(),
    CacheKeys.fiction("all"),
    CacheConfig.long
  )()
}
Keep app/api/ routes only if they are consumed by external clients or mobile apps.
When handling user-private data
If the data belongs to a specific user, include userId in the cache key:
tsexport function getUserProfileCached(userId: string) {
  return unstable_cache(
    () => repo.getByUserId(userId),
    ["profile", userId],   // userId in key — never shared between users
    CacheConfig.medium
  )()
}

Strict rules — never break these

cache() from React — only on read methods in repository impl
unstable_cache — only in queries.ts
"use server" — only in actions.ts
revalidateTag — every mutation must invalidate cache
Use-cases receive repo as parameter — never instantiate inside
Features never import from each other — use shared/ for cross-feature types
No barrel exports (index.ts) — import directly from the file
No fetch('/api/...') calls from Server Components — call functions directly
Migrations stay in supabase/migrations/ — outside src/