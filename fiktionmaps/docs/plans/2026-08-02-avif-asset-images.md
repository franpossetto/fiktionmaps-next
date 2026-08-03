# Plan: AVIF asset images (admin re-upload + codec preview)

Status: in progress (v1 scoped to fiction covers).

## Goal

Serve lighter image payloads than WebP by encoding asset variants as **AVIF**, without losing perceptible quality. With few images already uploaded, migrate via **admin re-upload** (not a batch job, not contributions).

Admin must be able to **preview WebP vs AVIF side-by-side** (visual quality + byte size + dimensions) before confirming upload, so we can calibrate quality settings with real assets.

Out of scope (v1):

- Contribution / pending image pipeline (`uploadPendingContributionImage`) — keep WebP until AVIF is validated in admin
- Client-side WASM AVIF encoder as production path (friend’s browser script)
- Dual storage (WebP + AVIF forever) / `<picture>` fallback
- Batch migration job over existing Storage objects
- Schema column `format` on `asset_images` (optional later; URL extension is enough for v1)

---

## 0. Open decisions

| # | Topic | Recommendation | Alternatives |
|---|---|---|---|
| D1 | Where to add AVIF | Extend `lib/asset-images/*` with a shared encode helper + `ImageCodec` config | New parallel “avif service” module — duplicates upload/replace/pending |
| D2 | Default codec after calibration | `avif` for **fiction covers** only in v1 (`uploadFictionImageAction` cover + create cover); banners/places/profile/contributions stay WebP | Flip all admin callers at once |
| D3 | Preview encode source of truth | **Server sharp** (same as production) via `previewImageCodecsAction` | Browser WASM preview — faster UX but numbers ≠ production |
| D4 | Migration of existing WebPs | Admin re-upload per entity (`replace: true` already deletes old rows/objects) | Batch re-encode from Storage WebP (generational loss) |
| D5 | Quality knobs | New `VARIANT_AVIF_QUALITY` map; start ~50–60 and tune against WebP 85 visually | Match friend’s `quality: 60` literally without A/B |
| D6 | Filenames | `{variant}_{version}.avif` / `xs_{size}_{version}.avif` + `contentType: image/avif` | Keep `.webp` extension with AVIF bytes — wrong, breaks caches/CDN |

Until confirmed, the rest of this plan assumes **D1–D6 recommendations**.

---

## 1. Discovery

### 1.1 What already exists

| Piece | Path / note |
|---|---|
| Upload + WebP | `lib/asset-images/image-variant-service.ts` → `uploadEntityImage()`, `validateImageFile()` |
| Pending contrib | `lib/asset-images/pending-contribution-image.ts` → WebP only (leave alone in v1) |
| xs backfill | `lib/asset-images/ensure-xs-variant.ts` → hardcodes `.webp` |
| Sizes / quality | `lib/asset-images/variant-sizes.ts` → `VARIANT_SIZES`, `VARIANT_WEBP_QUALITY`, bucket `asset-images` |
| Admin fiction upload | `fiction.actions.ts` (`uploadFictionImageAction` / create with cover+banner) + `fictions-tab.tsx` / `fiction-edit-view.tsx` |
| Admin place upload | `place.actions.ts` → `uploadPlaceImageAction` |
| Profile avatar | `user.actions.ts` → `uploadEntityImage` (can stay WebP in v1 or follow admin codec later) |
| DB | `asset_images`: one row per `(entity_type, entity_id, role, variant)`; **no format column**; URL is canonical |
| Replace | `uploadEntityImage({ replace: true })` deletes prior `asset_images` rows and Storage objects derived from URL |

### 1.2 Gaps

1. Codec is hardcoded: `sharp().webp()`, `.webp` paths, `image/webp`.
2. No way for admin to compare codecs before commit.
3. Existing objects are WebP; no migration UI beyond “upload again”.

### 1.3 Why not a separate module

The pipeline is already: validate → resize → encode → Storage → `asset_images`. Only the **encode + extension + contentType** step changes. A second module would fork pending/ensure-xs/upload.

### 1.4 Friend’s browser AVIF script

Useful as **UX inspiration** (resize → encode → File + size check). Not the production encoder:

- Would diverge from sharp output (quality/size mismatch vs what we store).
- Still need server for Storage + DB + multi-variant.
- Heavy on weak devices; admin-only doesn’t justify dual stacks.

Optional later: client preview for snappiness, labeled “approximate”.

### 1.5 Architecture constraints

- Prefer thin composition in `infrastructure/next` calling shared lib encode + existing upload helper (same pattern as today for `uploadEntityImage`).
- If preview grows business rules, wrap in a small use case; otherwise a dedicated action that only returns metrics + data URLs is fine for admin tooling.
- Do not change contribution use cases in this plan.

---

## 2. Product shape

### 2.1 Admin flow (v1)

1. Admin opens fiction/place (or city) edit and picks a cover/banner/hero file (as today).
2. Before save (or right after file select), UI calls **preview** action with the file + target variants (at least `lg`; optionally `sm`).
3. Panel shows **WebP | AVIF** for the same variant:
   - image preview
   - width × height
   - bytes (and % savings of AVIF vs WebP)
4. Admin confirms → upload with codec **`avif`** only (single format in Storage).
5. `replace: true` removes previous WebP rows/objects.

### 2.2 Data contract after AVIF upload

| Store | Value |
|---|---|
| Storage path | `{entityType}/{entityId}/{role}/{variant}_{ts}.avif` (xs: `xs_{size}_{ts}.avif`) |
| `contentType` | `image/avif` |
| `asset_images.url` | Public URL of that object |
| Legacy | Old `.webp` URLs gone after replace |

UI that already uses `next/image` / `<img src={url}>` keeps working; browsers that load our app already support AVIF.

### 2.3 Contributions

Unchanged: still WebP via `uploadPendingContributionImage`. Follow-up plan after admin calibration.

---

## 3. Technical design

### 3.1 Shared encode helper

Add something like `lib/asset-images/encode-image-variant.ts` (name flexible):

```ts
export type ImageCodec = "webp" | "avif"

export async function encodeImageVariant(
  buffer: Buffer,
  variant: ImageVariant,
  codec: ImageCodec,
): Promise<{ buffer: Buffer; contentType: string; extension: string }>
```

- Resize with `VARIANT_SIZES[variant]`, `withoutEnlargement: true` (same as today).
- `codec === "webp"` → `.webp({ quality: VARIANT_WEBP_QUALITY[variant] })`
- `codec === "avif"` → `.avif({ quality: VARIANT_AVIF_QUALITY[variant], effort?: … })`
- Return `image/webp` | `image/avif` and `webp` | `avif`.

Wire into:

1. `uploadEntityImage` — accept `codec?: ImageCodec` (default `"webp"` initially, or `"avif"` once admin path opts in).
2. `ensure-xs-variant` — only when source/upload path is AVIF; **v1**: if admin always regenerates full variant set including `xs`, ensure-xs may stay WebP until touched, or detect extension from source URL. Prefer: **upload generates all variants in one codec**, so ensure-xs is rarely needed for new assets.

### 3.2 Quality config

In `variant-sizes.ts`:

```ts
export const VARIANT_AVIF_QUALITY: Record<ImageVariant, number> = {
  xs: 55,
  sm: 55,
  lg: 55,
  xl: 55,
}
```

Tune after preview A/B (goal: visual ≈ current WebP 85, smaller bytes).

### 3.3 Preview action (admin)

`previewImageCodecsAction(formData)` (e.g. under `src/asset-images/infrastructure/next/`):

- Auth/admin gate (same as other admin uploads).
- `validateImageFile`.
- Encode requested variants for **both** codecs in memory (no Storage write).
- Return for each codec/variant: `byteLength`, `width`, `height`, `dataUrl` (or base64) for preview.
- Cap: only `lg` (and maybe `sm`) to keep payload small; do not preview all four unless needed.

### 3.4 Admin UI

Minimal addition on fiction edit / place image upload (and city if applicable):

- After file select → call preview → render comparison strip.
- Show savings `%`.
- Primary CTA still the existing save/upload; codec fixed to AVIF on confirm for this plan.
- No contribution wizards.

### 3.5 Call sites to switch to AVIF (v1)

| Caller | Change |
|---|---|
| `uploadFictionImageAction` / fiction create cover+banner | `codec: "avif"` |
| `uploadPlaceImageAction` / place create image | `codec: "avif"` |
| City image upload (if present) | `codec: "avif"` |
| Profile / contributions | leave default WebP |

---

## 4. Implementation steps

1. [x] **Config + encode helper** — `VARIANT_AVIF_QUALITY`, `encodeImageVariant`.
2. [x] **Plumb `codec` into `uploadEntityImage`** — paths, contentType, sharp via helper.
3. [x] **`previewImageCodecsAction`** — both codecs, metrics + data URLs; admin-only; `lg` only.
4. [x] **Admin UI** — `/admin/fiction/[id]/improve-photo` wizard: choose cover|hero → replace+focus → WebP vs AVIF q48 compare. Effort 6.
5. [x] **Opt-in `codec: "avif"`** on fiction cover create + `uploadFictionImageAction` (cover + banner/hero).
6. [x] **Bucket MIME** — migration `071_asset_images_allow_avif.sql` (`image/webp` + `image/avif`).
7. [ ] **Manual migration** — re-upload existing fiction covers; verify map/detail/chips.
8. [ ] **Calibrate** — adjust `VARIANT_AVIF_QUALITY` from real previews; document chosen values here.
9. [x] **Places** — `/admin/place/[id]/improve-photo` (avatar, 3:2, AVIF q48); menu from locations tab.
10. [x] **Contributions + ensure-xs** — pending uploads AVIF; promote keeps extension; ensure-xs matches source codec; contributor create place AVIF.
11. **Follow-up** — cities, profile avatar AVIF if desired.

---

## 5. Test plan

- [ ] Preview: same source file → AVIF bytes &lt; WebP bytes for `lg` at default qualities (or document if not).
- [ ] Preview visuals: no obvious banding/artifacts vs WebP at chosen quality.
- [ ] Upload fiction cover as AVIF → `asset_images` URLs end in `.avif`, Storage content-type `image/avif`.
- [ ] Replace: old `.webp` objects/rows gone after re-upload.
- [ ] Fiction detail / list / map chips still render.
- [ ] Place hero/avatar same.
- [ ] Contribution photo upload still produces WebP (unchanged).
- [ ] Reject invalid type/size still works via `validateImageFile`.

---

## 6. Risks / notes

- **Encode CPU**: AVIF is slower than WebP on server; OK for admin frequency.
- **No original kept**: re-upload from device is best quality; converting Storage WebP→AVIF is worse — we avoid that in v1.
- **Bucket MIME**: confirm `asset-images` allows `image/avif` (Supabase bucket allowed MIME list); update if restricted to webp only.
- **Cache**: new paths/version timestamps avoid stale CDN; `cacheControl: 31536000` stays.

---

## 7. Done when

- Admin can compare WebP vs AVIF (size + look) before upload.
- Admin uploads persist AVIF variants via the existing service (no new module).
- Existing few WebP assets can be replaced by re-upload.
- Contributions remain on WebP until a follow-up.
