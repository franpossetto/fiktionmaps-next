# FiktionMaps agent guide

The application lives in `fiktionmaps/`.

- Read `fiktionmaps/docs/reference/architecture.md` before changing business operations.
- Follow the enforced rules in `.cursor/rules/`.
- Treat `fiktionmaps/docs/reference/` as current system documentation.
- Treat `fiktionmaps/docs/plans/` as implementation notes, not as current system truth.
- Only use a plan when the task explicitly references it or concerns that feature.
- When a plan is completed, move durable decisions into `reference/` (delete the plan if it no longer adds value).
