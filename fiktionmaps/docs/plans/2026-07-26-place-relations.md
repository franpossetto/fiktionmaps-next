# Plan: place relations (siblings & cousins)

**Status: superseded.** See `2026-08-02-place-relationships.md`.

The premise that siblings are derived from a shared `location_id` does not apply: the product invariant is **1 place ↔ 1 location** (clone data, never reuse the row). Both relationship types are declared in `place_relationships` (`shared` / `composite`).

This file is kept only as naming history (siblings / cousins) until wrap-up of the current plan.
