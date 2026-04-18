# src — framework-agnostic logic

This folder centralizes **logic that has no UI** and **interacts with the backend**. It is intended to be **independent of the framework** (Next.js, React, etc.) so it can be reused or tested in isolation.

- **Domain**: entities and value types (`*.domain.ts`).
- **Ports**: interfaces for persistence and external services (`*.repository.port.ts`).
- **Adapters**: implementations (Supabase, mocks, API clients) that satisfy the ports.
- **Services**: use-case functions built from ports/adapters (`*.services.ts`).

The app wires these pieces in `lib/server` (adapters + session/anonymous clients) and `lib/server/queries` (cached reads for RSC via Next.js `unstable_cache` / React `cache`). App code typically imports from the barrel `@/lib/server`.

For vocabulary, layers, entry points, and how to add a new module, see [docs/architecture-modules.md](../docs/architecture-modules.md).
