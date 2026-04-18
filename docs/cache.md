# Cache Strategy

This project uses a simple layered cache strategy focused on fast reads and safe invalidation.

## 1) Current cache layers

- `unstable_cache` (`next/cache`) for public/shared data with TTL + tags.
  - Implemented in `fiktionmaps/lib/app-services.ts`.
  - Current examples: `getAllFictions`, `getAllCities`.
- `cache()` (`react`) for request-scoped dedupe (same request/render should not hit DB twice).
  - Used for read actions and request-level reads in profile/checkins/homes/scenes.
  - Good for user-scoped data where shared cache is not appropriate.
- Client state hydration from server props on profile pages.
  - Reduces initial client round-trips.
  - Implemented via `profile/page.tsx` prefetch + `UserProfileComponent` initial props.

## 2) Profile implementation (fast path)

We keep profile user-scoped data out of global shared cache and use request dedupe + SSR hydration:

- `profile/page.tsx` preloads:
  - profile
  - scenes preview
  - city/place checkins
  - homes
  - cities catalog
- `user-profile.tsx` starts from those initial values and avoids first mount refetch.
- `HomesProvider` accepts initial homes/cities and only fetches when initial data is missing.

### Why this is consistent

- Public catalog data (`cities`, `fictions`) stays in `unstable_cache` with tags.
- User data (`profile`, `homes`, `checkins`, profile scenes) uses request-scoped `cache()`.
- This avoids cross-user leakage while keeping render latency low.

## 3) Invalidation model

- Public shared cache invalidation:
  - Use `revalidateTag(...)` (and `revalidatePath(...)` when needed) in write actions.
- User-scoped request cache invalidation:
  - No explicit cross-request invalidation needed.
  - Fresh request gets fresh data; UI can do local optimistic update or explicit refetch after writes.

## 4) Rules of thumb

- Use `unstable_cache` only for anonymous/public-safe reads.
- Use `cache()` for user/session-scoped reads or repeated calls in one request.
- Prefer server prefetch + prop hydration for profile-like pages to avoid mount waterfalls.
- Keep TTLs short when uncertain, then tune with metrics.

## TODO (improvements)

- Add shared cache for map endpoints with careful keys (`cityId`, normalized `bbox`, `fictionIds`) and short TTL.
- Standardize cache tags in one module (`cities`, `fictions`, `places`, `checkins`, `homes`, `scenes`).
- Add explicit post-mutation refresh flow for profile widgets (homes/checkins/scenes) where UX needs instant consistency.
- Add lightweight latency metrics (p50/p95) for profile and map endpoints before/after cache changes.
- Evaluate enabling image optimization/cache strategy (`next/image`) where safe for bandwidth and TTFB.
