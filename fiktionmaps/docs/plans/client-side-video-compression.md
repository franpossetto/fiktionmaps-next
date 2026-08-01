# Client-side Video Compression for Scenes

## Goal
Reduce video file sizes in the user's browser before uploading to Supabase. This saves bandwidth and storage, and keeps feeds/lists fast by serving a lightweight preview instead of the full clip.

> Note: the `asset-videos` bucket already allows up to **500 MB** (`064_increase_video_bucket_limit.sql`). Compression is **not** mainly about bypassing a 50 MB Storage limit anymore — it is about smaller uploads, cheaper storage, and faster playback in lists.

The process generates two variants:
1. **Video** (`videoUrl`): high-quality optimized MP4 for detail / watch views.
2. **Preview** (`previewUrl`): low-resolution, muted, low-framerate MP4 used as an animated preview in feeds and lists (GIF-like UX via `<video autoPlay loop muted playsInline>`). Prefer the name `previewUrl` / `preview_url` over `gifUrl` — it is still an MP4, not a GIF.

## Technology
- **FFmpeg.wasm** (`@ffmpeg/ffmpeg` + `@ffmpeg/util`): WebAssembly port of FFmpeg that runs in the browser. It re-encodes the user's file (e.g. iPhone `.mov`) into web-friendly H.264 MP4s without a server.

### What FFmpeg.wasm is for (plain language)
FFmpeg is a media tool (trim, resize, change codec, mute audio, etc.). The `.wasm` build runs that tool **inside the browser tab**, so the original huge file never has to be uploaded first — we shrink it locally, then upload the smaller results.

### Single-thread vs multi-thread (important)
FFmpeg.wasm ships in two modes:

| Mode | Package / core | Needs COOP/COEP headers? | Speed | When to use |
|---|---|---|---|---|
| **Single-thread** | `@ffmpeg/core` | **No** | Slower (one CPU core) | **Default for FiktionMaps** — avoids breaking Mapbox / Google / third-party assets site-wide |
| **Multi-thread** | `@ffmpeg/core-mt` | **Yes** (`SharedArrayBuffer`) | Faster | Only if we later isolate upload pages and prove Mapbox still works |

**Decision for this plan: start with single-thread.** We skip global cross-origin isolation. Encoding is slower, but the rest of the product (map, Street View, images) stays safe.

## Size & duration limits

| Limit | Value | Why |
|---|---|---|
| **Client input max (contribute / admin upload UI)** | **100 MB** | FFmpeg.wasm loads the whole file into browser memory (MEMFS). 200–500 MB inputs often OOM or freeze Safari/Android. 100 MB is a practical ceiling for scene clips. |
| **Bucket hard limit** | Keep **500 MB** | Leave headroom for future server-side jobs / admin exceptions; do not rely on it for the WASM path. |
| **Duration (recommended)** | Cap scene clips at **~60 s** (enforce in UI if product allows) | Keeps encode time predictable on phones. |

Validate the **input** at 100 MB before processing. After compression, outputs should be well under the bucket limit; still fail clearly if an output somehow exceeds Storage rules.

## Formats & Compression Strategy

### 1. Video variant (`videoUrl`)
- **Container**: MP4
- **Video**: H.264 (`libx264`), CRF ~23, preset `veryfast` (client CPU; avoid `fast`/`medium`)
- **Audio**: AAC 128k
- **Extras (required for web/iOS)**: `-pix_fmt yuv420p`, `-movflags +faststart`
- **Resolution**: cap at 1080p without upscaling — `scale='min(1920,iw)':-2`
- **Command sketch**:
  ```
  -i input -vf "scale='min(1920,iw)':-2" -c:v libx264 -crf 23 -preset veryfast -pix_fmt yuv420p -c:a aac -b:a 128k -movflags +faststart output_video.mp4
  ```

### 2. Preview variant (`previewUrl`)
- **Container**: MP4
- **Video**: H.264, CRF ~32, preset `veryfast`, 15 fps
- **Audio**: removed (`-an`)
- **Resolution**: max 480p height **without upscaling** — `scale=-2:'min(480,ih)'` (not `scale=-2:480`, which can upscale short videos)
- **Extras**: `-pix_fmt yuv420p`, `-movflags +faststart`
- **Command sketch**:
  ```
  -i input -vf "scale=-2:'min(480,ih)'" -r 15 -c:v libx264 -crf 32 -preset veryfast -pix_fmt yuv420p -an -movflags +faststart output_preview.mp4
  ```
- **UI**: `<video autoPlay loop muted playsInline>` to simulate a GIF.

**Encode order**: run the two FFmpeg commands **sequentially** on one instance (parallel ≈ 2× memory). Drop/release the original `File` from memory after both outputs exist.

## Implementation Steps

### Step 1: Dependencies
```bash
npm install @ffmpeg/ffmpeg @ffmpeg/util
```
Use the **single-thread** core (`@ffmpeg/core`) so SharedArrayBuffer / site-wide COOP+COEP are not required.

Lazy-load the processor and WASM core (dynamic `import()`, client-only). Never put FFmpeg in the main bundle — the core is tens of MB.

### Step 2: Cross-origin isolation — **do not enable site-wide**
**Do not** set `Cross-Origin-Embedder-Policy: require-corp` + `COOP: same-origin` on `/(.*)`. That breaks or risks Mapbox tiles/scripts, Google Street View, TMDB/Unsplash images, and other third-party assets unless every resource sends CORP headers.

With **single-thread FFmpeg**, skip COOP/COEP entirely for the MVP.

**Optional later (only if multi-thread is worth it):**
- Scope headers to upload routes only (e.g. `/contribute/scene`, admin scene editors), **never** the whole app.
- Or try `COEP: credentialless` and re-test Mapbox thoroughly.
- Gate with `window.crossOriginIsolated` and fall back to single-thread if false.

### Step 3: Database & entity updates
1. Migration: add `preview_url` (TEXT, nullable) to `scenes` (name preferred over `gif_url`).
2. Update `scene.entity.ts`, `scene.schemas.ts`, repository mappers → `previewUrl`.
3. Contribution / `add_scene` path: accept and persist both `videoUrl` and `previewUrl`.
4. Staff feed snapshots: today use `sceneVideoUrl`; add `scenePreviewUrl` (or equivalent) so lists can prefer the preview without loading the full clip.
5. Delete / replace video: `removeVideoObjectIfAny` (and orphan-cleanup plan) must remove **both** storage objects when either URL changes or the scene is cleaned up.

### Step 4: Storage structure & fallbacks
Upload under `asset-videos`:
- `scenes/<uuid>/<name>_video.mp4` → `videoUrl`
- `scenes/<uuid>/<name>_preview.mp4` → `previewUrl`

**Fallback for legacy rows** (`previewUrl` null):
1. Feeds / lists / up-next / thumbs: use `previewUrl ?? videoUrl`.
2. Detail / watch: always `videoUrl`.
3. Optional later: server job to backfill `previewUrl` for old rows. UI fallback is enough for MVP.

### Step 5: Video processing utility
Create `lib/video/client-video-processor.ts` (browser-only):
1. Dynamically load FFmpeg single-thread core.
2. Write user `File` into FFmpeg MEMFS.
3. Run video encode, then preview encode (sequential).
4. Read outputs as `Blob`/`File`; revoke/drop original when done.
5. Progress callback (0–100%), including distinct phases: load core → encode video → encode preview.
6. Surface clear errors for OOM / unsupported codecs (e.g. some HEVC edge cases).

### Step 6: Upload UI (contribute **and** admin)
Apply the same pipeline in:
- `scene-contribute-wizard.tsx`
- `scenes-tab.tsx`
- `scene-edit-view.tsx`

**When to process:** start compression **on file select** (contribute step 3 / admin video field), not on final submit. Show a progress bar while encoding; user can continue filling the form. On submit, only upload if outputs are ready (or wait with UI).

Flow:
1. Validate mime + **≤ 100 MB** (+ duration if enforced).
2. Process → two files.
3. Upload both to `asset-videos`.
4. Submit action with `videoUrl` + `previewUrl`.

### Step 7: UI playback updates
- Lists / feeds / up-next / `ScenePreviewThumb` (when no static thumbnail): `previewUrl ?? videoUrl`, preferably looping muted autoplay where the design calls for “GIF-like” motion.
- Detail / watch / staff review player: `videoUrl` with controls.

## Trade-offs & Considerations
- **Processing time**: single-thread WASM on a mid phone may take tens of seconds for a ~100 MB clip. Progress UI is mandatory; do it early in the flow.
- **Mobile**: CPU + memory heavy; 100 MB input cap + sequential encodes reduce crash risk.
- **No site-wide COEP**: product stability over encode speed for MVP.
- **Bundle**: WASM must stay lazy-loaded; only on pages that upload scene video.
- **Orphans**: rejecting `add_scene` already leaves storage objects; with two files, orphan cleanup must delete both (see `orphan-video-cleanup.md`).

## Out of scope / later
- Multi-thread FFmpeg + route-scoped isolation headers.
- Server-side backfill of `previewUrl` for legacy scenes.
- Hybrid: upload original + generate preview in a worker/Edge job.
