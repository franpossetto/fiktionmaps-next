# src — business logic (framework-agnostic)

Logic with **no UI** and **no direct Next.js coupling** lives here. Each feature is a module under `src/<feature>/`.

## Structure per module

```
src/<feature>/
├── domain/
│   ├── <feature>.entity.ts       # entities, value types
│   ├── <feature>.repository.ts   # port (interface)
│   ├── <feature>.dtos.ts         # optional input/output shapes
│   └── <feature>.schemas.ts      # optional Zod (domain validation)
├── application/
│   └── <action>-<feature>.usecase.ts   # one file = one operation
└── infrastructure/
    ├── supabase/
    │   └── <feature>.repository.impl.ts   # only place for supabase.from(...) on business tables
    └── next/
        ├── <feature>.queries.ts    # cached reads (RSC)
        └── <feature>.actions.ts    # server actions ("use server")
```

## Fixed flow per business operation

1. **domain/** — port (`*.repository.ts`), entities, Zod schemas.
2. **infrastructure/supabase/** — Supabase adapter + mappers.
3. **application/** — use case (`*.usecase.ts`); talks only to ports; **never** imports `@/lib/supabase/server`.
4. **infrastructure/next/** — actions/queries: validate → call use case → return → `revalidatePath` / `revalidateTag` if needed.

## Hard rules

- Every action/query that reads or writes business data **must call a use case**, not the repo or Supabase directly.
- In `infrastructure/next`: **forbidden** to call repo methods (`repo.getById`, etc.) or repeat business logic. Only wire adapters into use cases (composition root).
- In `infrastructure/next`: **forbidden** `supabase.from(...)` on business tables. **Exception**: `createClient()` only for `auth.getUser()` / session at the edge.
- Action result types (`{ success, error }`, `CreateXResult`) belong in `infrastructure/next` or `*.actions.types.ts`, not in `domain/*.schemas.ts`.

## What is not in `src/`

| Path | Role |
|------|------|
| `app/` | Routes, pages, layouts (framework entry) |
| `components/` | React UI |
| `lib/` | Shared clients (`lib/supabase/`), map UI, validation helpers, theme — **not** domain modules |
| `supabase/migrations/` | SQL migrations |

## Shared cross-cutting

- `src/shared/infrastructure/next/cache.config.ts` — `unstable_cache` revalidate presets
- `src/shared/infrastructure/next/cache.keys.ts` — cache key helpers

## Further reading

- [docs/architecture-modules.md](../docs/architecture-modules.md) — full reference, checklist, anti-patterns
- `.cursor/rules/fiktionmaps-architecture.mdc` — enforced rule for agents
