import { createClient } from "@/lib/supabase/client"
import { ASSET_VIDEOS_BUCKET } from "@/lib/asset-videos/asset-videos-bucket"

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_")
}

async function uploadOne(path: string, file: File): Promise<string> {
  const supabase = createClient()
  const { error } = await supabase.storage.from(ASSET_VIDEOS_BUCKET).upload(path, file, {
    contentType: file.type || "video/mp4",
    upsert: false,
  })
  if (error) throw new Error(error.message)
  const { data } = supabase.storage.from(ASSET_VIDEOS_BUCKET).getPublicUrl(path)
  return data.publicUrl
}

/** Uploads compressed video + preview pair under `scenes/<uuid>/`. */
export async function uploadSceneVideoPair(files: {
  video: File
  preview: File
}): Promise<{ videoUrl: string; previewUrl: string }> {
  const folder = `scenes/${crypto.randomUUID()}`
  const videoName = sanitizeFileName(files.video.name.endsWith(".mp4") ? files.video.name : "scene_video.mp4")
  const previewName = sanitizeFileName(
    files.preview.name.endsWith(".mp4") ? files.preview.name : "scene_preview.mp4",
  )

  const [videoUrl, previewUrl] = await Promise.all([
    uploadOne(`${folder}/${videoName}`, files.video),
    uploadOne(`${folder}/${previewName}`, files.preview),
  ])

  return { videoUrl, previewUrl }
}
