/** Same allowlist as the `asset-videos` bucket / admin scene wizard (`scenes-tab.tsx`). */
export const SCENE_VIDEO_ALLOWED_MIME_TYPES = ["video/mp4", "video/webm", "video/quicktime"]

export const SCENE_VIDEO_ACCEPT = SCENE_VIDEO_ALLOWED_MIME_TYPES.join(",")

/**
 * Client input cap for FFmpeg.wasm compression (MEMFS).
 * Bucket hard limit remains 500 MB; do not rely on it for the WASM path.
 */
export const SCENE_VIDEO_MAX_BYTES = 100 * 1024 * 1024

export function validateSceneContributeVideoFile(
  file: File,
  messages: { videoFormatInvalid: string; videoTooLarge: string },
): string | null {
  if (!SCENE_VIDEO_ALLOWED_MIME_TYPES.includes(file.type)) {
    return messages.videoFormatInvalid
  }
  if (file.size > SCENE_VIDEO_MAX_BYTES) {
    return messages.videoTooLarge
  }
  return null
}
