/**
 * Browser-only scene video compression via FFmpeg.wasm (single-thread core).
 * Lazy-load this module — do not import from server components.
 *
 * Assets are served from `/ffmpeg/*` (copied from node_modules via
 * `npm run copy:ffmpeg` / postinstall). The class worker must be a same-origin
 * URL (not a blob): worker.js imports ./const.js and ./errors.js.
 */

export type SceneVideoProcessProgress = {
  /** 0–100 */
  percent: number
  phase: "loading" | "encoding_video" | "encoding_preview" | "done"
}

export type SceneVideoProcessResult = {
  videoFile: File
  previewFile: File
}

/** Same-origin static assets (see `public/ffmpeg` via copy-ffmpeg-assets). */
const FFMPEG_PUBLIC_BASE = "/ffmpeg"
const LOAD_TIMEOUT_MS = 120_000

function inputExtension(file: File): string {
  const fromName = file.name.split(".").pop()?.toLowerCase()
  if (fromName && /^[a-z0-9]+$/.test(fromName) && fromName.length <= 5) return fromName
  if (file.type === "video/webm") return "webm"
  if (file.type === "video/quicktime") return "mov"
  return "mp4"
}

function mapProgress(
  phase: SceneVideoProcessProgress["phase"],
  ratio: number,
  onProgress?: (p: SceneVideoProcessProgress) => void,
) {
  if (!onProgress) return
  const clamped = Math.min(1, Math.max(0, ratio))
  let percent = 0
  if (phase === "loading") percent = Math.round(clamped * 12)
  else if (phase === "encoding_video") percent = 12 + Math.round(clamped * 48)
  else if (phase === "encoding_preview") percent = 60 + Math.round(clamped * 38)
  else percent = 100
  onProgress({ percent, phase })
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = window.setTimeout(() => {
      reject(new Error(`${label} timed out after ${Math.round(ms / 1000)}s. Refresh and try again.`))
    }, ms)
    promise.then(
      (v) => {
        window.clearTimeout(t)
        resolve(v)
      },
      (err) => {
        window.clearTimeout(t)
        reject(err)
      },
    )
  })
}

/**
 * Re-encodes `file` into a full H.264 MP4 + a muted 480p/15fps preview MP4.
 */
export async function processSceneVideoClient(
  file: File,
  onProgress?: (p: SceneVideoProcessProgress) => void,
): Promise<SceneVideoProcessResult> {
  const { FFmpeg } = await import("@ffmpeg/ffmpeg")
  const { fetchFile, toBlobURL } = await import("@ffmpeg/util")

  const ffmpeg = new FFmpeg()

  try {
    mapProgress("loading", 0, onProgress)

    const origin = window.location.origin
    const base = `${origin}${FFMPEG_PUBLIC_BASE}`
    // Worker must stay a real URL so its relative imports (const.js / errors.js) resolve.
    const classWorkerURL = `${base}/worker.js`

    const [coreURL, wasmURL] = await Promise.all([
      toBlobURL(`${base}/ffmpeg-core.js`, "text/javascript"),
      toBlobURL(`${base}/ffmpeg-core.wasm`, "application/wasm"),
    ])
    mapProgress("loading", 0.7, onProgress)

    await withTimeout(
      ffmpeg.load({ coreURL, wasmURL, classWorkerURL }),
      LOAD_TIMEOUT_MS,
      "FFmpeg load",
    )
    mapProgress("loading", 1, onProgress)

    const ext = inputExtension(file)
    const inputName = `input.${ext}`
    const videoOut = "output_video.mp4"
    const previewOut = "output_preview.mp4"

    await ffmpeg.writeFile(inputName, await fetchFile(file))

    let currentPhase: SceneVideoProcessProgress["phase"] = "encoding_video"
    ffmpeg.on("progress", ({ progress }) => {
      mapProgress(currentPhase, progress, onProgress)
    })

    currentPhase = "encoding_video"
    mapProgress("encoding_video", 0, onProgress)
    const videoCode = await ffmpeg.exec([
      "-i",
      inputName,
      "-vf",
      "scale='min(1920,iw)':-2",
      "-c:v",
      "libx264",
      "-crf",
      "23",
      "-preset",
      "veryfast",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      "-movflags",
      "+faststart",
      videoOut,
    ])
    if (videoCode !== 0) {
      throw new Error("Video compression failed. Try a shorter clip or a different format (MP4).")
    }

    currentPhase = "encoding_preview"
    mapProgress("encoding_preview", 0, onProgress)
    const previewCode = await ffmpeg.exec([
      "-i",
      inputName,
      "-vf",
      "scale=-2:'min(480,ih)'",
      "-r",
      "15",
      "-c:v",
      "libx264",
      "-crf",
      "32",
      "-preset",
      "veryfast",
      "-pix_fmt",
      "yuv420p",
      "-an",
      "-movflags",
      "+faststart",
      previewOut,
    ])
    if (previewCode !== 0) {
      throw new Error("Preview compression failed. Try a shorter clip or a different format (MP4).")
    }

    const videoData = await ffmpeg.readFile(videoOut)
    const previewData = await ffmpeg.readFile(previewOut)
    if (typeof videoData === "string" || typeof previewData === "string") {
      throw new Error("Unexpected FFmpeg output format")
    }

    const baseName = file.name.replace(/\.[^.]+$/, "") || "scene"
    const videoFile = new File([new Uint8Array(videoData)], `${baseName}_video.mp4`, {
      type: "video/mp4",
    })
    const previewFile = new File([new Uint8Array(previewData)], `${baseName}_preview.mp4`, {
      type: "video/mp4",
    })

    mapProgress("done", 1, onProgress)
    return { videoFile, previewFile }
  } catch (err) {
    if (err instanceof Error) throw err
    throw new Error("Video compression failed on this device. Try a smaller file.")
  } finally {
    try {
      ffmpeg.terminate()
    } catch {
      // ignore
    }
  }
}
