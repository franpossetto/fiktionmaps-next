-- Allow multiple hunt_sources rows for the same fiction + URL (or label + URL).
-- Happy path: UI recommends reusing an existing source instead of creating duplicates.

DROP INDEX IF EXISTS public.unique_hunt_source_by_fiction;
DROP INDEX IF EXISTS public.unique_hunt_source_by_context;
