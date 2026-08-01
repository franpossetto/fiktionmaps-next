/**
 * Copies FFmpeg.wasm browser assets into public/ffmpeg for same-origin loading.
 * Run via postinstall (and before build if public/ was cleaned).
 */
import { cpSync, mkdirSync, existsSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const outDir = join(root, "public", "ffmpeg")

const files = [
  ["node_modules/@ffmpeg/ffmpeg/dist/esm/worker.js", "worker.js"],
  ["node_modules/@ffmpeg/ffmpeg/dist/esm/const.js", "const.js"],
  ["node_modules/@ffmpeg/ffmpeg/dist/esm/errors.js", "errors.js"],
  ["node_modules/@ffmpeg/core/dist/esm/ffmpeg-core.js", "ffmpeg-core.js"],
  ["node_modules/@ffmpeg/core/dist/esm/ffmpeg-core.wasm", "ffmpeg-core.wasm"],
]

for (const [fromRel] of files) {
  const from = join(root, fromRel)
  if (!existsSync(from)) {
    console.warn(`[copy-ffmpeg-assets] missing ${fromRel} — run npm install`)
    process.exit(0)
  }
}

mkdirSync(outDir, { recursive: true })
for (const [fromRel, name] of files) {
  cpSync(join(root, fromRel), join(outDir, name))
}
console.log("[copy-ffmpeg-assets] wrote public/ffmpeg")
