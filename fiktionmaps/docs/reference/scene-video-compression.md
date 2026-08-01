# Scene video compression (client-side)

How scene clips are compressed in the browser, uploaded to Storage, and stored on `scenes`. Planning notes: `docs/plans/client-side-video-compression.md`.

---

## Goal

Before upload, re-encode the user’s file in the browser into **two** MP4s:

| Variant | Field | Role |
| --- | --- | --- |
| **Video** (watch quality) | `scenes.video_url` / `Scene.videoUrl` | Detail / watch player |
| **Preview** (lightweight) | `scenes.preview_url` / `Scene.previewUrl` | Feeds, lists, up-next, GIF-like muted loops |

Both stay MP4 (H.264). Preview is not a GIF.

---

## Pipeline (intended)

```
User picks file (≤ 100 MB, mp4/webm/mov)
        │
        ▼
 processSceneVideoClient()     ← lib/video/client-video-processor.ts
   FFmpeg.wasm (single-thread)
   1) encode → *_video.mp4
   2) encode → *_preview.mp4
        │
        ▼
 uploadSceneVideoPair()        ← lib/asset-videos/upload-scene-videos.ts
   bucket: asset-videos
   paths:  scenes/<uuid>/<name>_video.mp4
           scenes/<uuid>/<name>_preview.mp4
        │
        ▼
 Server action / use case persists both URLs on scenes
```

### Where it runs (UI)

Compression starts **on file select**, not on final submit:

| Surface | File |
| --- | --- |
| Contribute scene wizard | `components/contribute/scene/scene-contribute-wizard.tsx` |
| Admin create scene | `components/admin/scenes-tab.tsx` |
| Admin edit scene | `components/admin/scene-edit-view.tsx` |

Submit only proceeds when both `processedVideoFile` and `processedPreviewFile` exist.

### Encode settings

Implemented in `processSceneVideoClient`:

**Video (`output_video.mp4` → `*_video.mp4`)**

- H.264 `libx264`, CRF 23, preset `veryfast`
- AAC 128k
- Cap 1080p without upscaling: `scale='min(1920,iw)':-2`
- `yuv420p`, `+faststart`

**Preview (`output_preview.mp4` → `*_preview.mp4`)**

- H.264, CRF 32, preset `veryfast`, 15 fps
- No audio (`-an`)
- Cap 480p height without upscaling: `scale=-2:'min(480,ih)'`
- `yuv420p`, `+faststart`

Encodes run **sequentially** on one FFmpeg instance (lower peak memory).

### FFmpeg loading

- Packages: `@ffmpeg/ffmpeg`, `@ffmpeg/util`, `@ffmpeg/core` (single-thread; no site-wide COOP/COEP).
- Browser assets are copied to **`/ffmpeg/*`** (`scripts/copy-ffmpeg-assets.mjs`, `postinstall` / `npm run copy:ffmpeg`). Ignored in git (`public/ffmpeg/` ~31 MB wasm).
- `ffmpeg-core.js` / `.wasm` load via same-origin `toBlobURL`.
- **`classWorkerURL` must be a real same-origin URL** (`/ffmpeg/worker.js`), not a blob: the worker ESM-imports `./const.js` and `./errors.js`. Blob-ifying only `worker.js` hangs forever around **~8%** (loading phase).
- Module is **dynamically imported** so WASM stays out of the main bundle.

### Storage & DB

- Bucket: `asset-videos` (limit 500 MB; client input capped at 100 MB).
- Column: `scenes.preview_url` (migration `065_scenes_preview_url.sql`), nullable for legacy rows.
- Delete / replace video must remove **both** storage objects when URLs change (`scene.repository.impl.ts`).

### Playback fallbacks

```ts
// lists / thumbs — src/scenes/domain/scene.helpers.ts
sceneListVideoUrl(scene) → previewUrl ?? videoUrl

// watch / detail — always videoUrl
```

---

## Diagnosis: why two files are not showing up

Checked against remote data on **2026-07-30**.

### Facts

1. **No row in `scenes` has `preview_url` set** (`preview_url is not null` → 0 rows).
2. The recent “Introduction” scene (`15e0d73d-…`, created 2026-07-29) has:
   - `video_url` → `…/scenes/8823b3f4-…/the-weekend-away-intro-3.mov`
   - `preview_url` → `null`
   - Storage folder contains **one** object: the original QuickTime (~8.8 MB), not `*_video.mp4` / `*_preview.mp4`.

### Root cause for that upload

That shape matches the **legacy single-file upload**, still present in committed `HEAD` admin code:

```ts
// HEAD scenes-tab.tsx — uploads the original File as-is
path = `scenes/${uuid}/${sanitizeFileName(file.name)}`
```

The dual-file path (`processSceneVideoClient` + `uploadSceneVideoPair`) always names outputs `*_video.mp4` and `*_preview.mp4`. A stored `*.mov` with no sibling preview means compression **never ran** for that upload (or an older build without the pair uploader was used).

So: seeing one file in Storage / empty `preview_url` is expected for that scene — it never went through the new pipeline end-to-end successfully.

### Why it can still fail or look broken with the new code

| Issue | Effect |
| --- | --- |
| **Legacy scenes** | `preview_url` null → UI falls back to `videoUrl`; watch “Preview” block only renders when `previewUrl` is set. Same quality is expected. |
| **UI only shows one player** | Contribute/admin preview uses `processedVideoFile ?? videoFile` (watch-quality blob). The low-res `processedPreviewFile` is kept in state for upload but **not shown** in the picker. Easy to think “only one file” even if both exist in memory. |
| **Verify in Storage, not only UI** | After a successful new upload, the folder must contain two objects: `…_video.mp4` and `…_preview.mp4`, and the row must have both URLs. |
| **FFmpeg stuck at ~8%** | Was loading the class worker as a blob without its sibling ESM files. Fixed by serving `/ffmpeg/worker.js` (+ `const.js` / `errors.js`) from the app. Hard refresh after `npm run copy:ffmpeg` if `public/ffmpeg` is missing. |
| **No silent fallback to original** | Current wizards do **not** upload the raw file if compression fails. If you still see a raw `.mov` in Storage, that upload used the old uploader (or code that bypassed the pair). |

### How to confirm a healthy upload

1. Pick a short clip in contribute or admin; wait for progress to finish (phases: loading → encoding_video → encoding_preview).
2. Submit.
3. In Supabase Storage → `asset-videos` → `scenes/<uuid>/`: **two** files ending in `_video.mp4` and `_preview.mp4`.
4. In `scenes`: both `video_url` and `preview_url` non-null and pointing at those objects.
5. On the watch page: main player = full clip; small “Preview” loop = low-res muted MP4.

---

## Related

- Plan: `docs/plans/client-side-video-compression.md`
- Orphan cleanup (both objects): `docs/plans/orphan-video-cleanup.md`
- Migration: `supabase/migrations/065_scenes_preview_url.sql`
