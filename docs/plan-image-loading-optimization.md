# Plan: Image loading optimization

## Summary of what we're doing

Goal: **minimize cost and maximize performance** when loading images (covers, banners, etc.) without changing infra or external services.

We make **three changes**:

1. **Storage cache**  
   When uploading each image to Supabase, we pass `cacheControl` in the upload. This is not "caching the upload": it configures the HTTP header Supabase will return when **any user requests** that URL. The **browser** and **CDN** then cache the image (per-user in the browser, shared in the CDN). Benefit: fewer repeated downloads and less egress; **no extra cost** (just one more parameter in the upload).

2. **Server cache (Next)**  
   We wrap the functions that fetch data (e.g. `getAllFictions()`, and optionally `getAllCities()`, `getFictionById()`) in `unstable_cache()` with a `revalidate` (e.g. 60–300 s). The server then reuses the result until it expires or is invalidated (we already use `revalidatePath` after admin mutations). Benefit: fewer DB calls and faster responses.

3. **Hero with large variant**  
   On the fiction detail page, the hero uses `bannerImage || coverImageLarge || coverImage` so we don't show the thumbnail (sm) when the large variant (lg) exists. Benefit: better quality without more storage.

**We do not**: enable Next Image optimization (remove `unoptimized`) or add an external CDN; that stays as a later option if needed.

---

## Current state (reminder)

- **Upload**: [lib/asset-images/image-variant-service.ts](fiktionmaps/lib/asset-images/image-variant-service.ts) generates WebP (sm 300 / lg 800 / xl 1200), uploads to Supabase Storage, persists URLs in `asset_images`. It does not send `cacheControl`.
- **Data**: [lib/app-services.ts](fiktionmaps/lib/app-services.ts) exposes `getAllFictions` etc. with no cache; each Server Component request hits Supabase again.
- **UI**: [fiction.repository.adapter.ts](fiktionmaps/src/fictions/fiction.repository.adapter.ts) maps to `coverImage` (sm), `coverImageLarge` (lg), `bannerImage` (lg). [next.config.ts](fiktionmaps/next.config.ts) has `images: { unoptimized: true }`.
- **Hero**: In [fiction-detail.tsx](fiktionmaps/components/fictions/fiction-detail.tsx) we sometimes use `coverImage` for the hero when `coverImageLarge` is available.

---

## Concrete actions

| # | Action | File | Details |
|---|--------|------|---------|
| 1 | Add `cacheControl` on upload | `lib/asset-images/image-variant-service.ts` | In the `.upload()` call, add option `cacheControl: '31536000'` (1 year) or `'86400'` (24 h). Affects **future reads** of that URL (browser + CDN). |
| 2 | Data cache with `unstable_cache` | `lib/app-services.ts` (or call sites) | Wrap `getAllFictions` in `unstable_cache(fn, ['fictions'], { revalidate: 60 })`. Optional: same pattern for `getAllCities`, `getFictionById` with their tags. After admin mutations we already use `revalidatePath`; if using tags, call `revalidateTag('fictions')` where appropriate. |
| 3 | Hero with large variant | `components/fictions/fiction-detail.tsx` | For `heroSrc` use order: `bannerImage \|\| coverImageLarge \|\| coverImage`. For `coverSrc` (thumbnail) keep using `coverImage`. |

---

## Impact summary

- **Storage cache**: same upload code; first time a user requests the image it is cached in CDN/browser; others benefit (CDN shared).
- **Server cache**: fewer Supabase calls per page view; revalidation by time and by `revalidatePath`/`revalidateTag`.
- **Hero variant**: better visual quality with no new assets or extra cost.

All in application code, no Supabase dashboard changes or additional costs.
