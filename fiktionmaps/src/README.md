# src — framework-agnostic logic

This folder centralizes **logic that has no UI** and **interacts with the backend**. It is intended to be **independent of the framework** (Next.js, React, etc.) so it can be reused or tested in isolation.

- **Domain**: entities and value types (`*.domain.ts`).
- **Ports**: interfaces for persistence and external services (`*.repository.port.ts`).
- **Adapters**: implementations (Supabase, mocks, API clients) that satisfy the ports.
- **Services**: use-case functions built from ports/adapters (`*.services.ts`).

The app (e.g. `lib/app-services.ts`, `lib/api/registry.ts`) wires these pieces and exposes them to the rest of the codebase.
