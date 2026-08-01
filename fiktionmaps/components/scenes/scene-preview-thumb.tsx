import Image from "next/image"
import { Clapperboard } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Scene } from "@/src/scenes/domain/scene.entity"
import { sceneListVideoUrl } from "@/src/scenes/domain/scene.helpers"

/** Force browsers to decode a visible frame for list thumbs (`preload=metadata` alone is often blank). */
function videoThumbSrc(url: string): string {
  if (url.includes("#")) return url
  return `${url}#t=0.1`
}

/**
 * List/sidebar preview: prefers `asset_images` thumbnail; otherwise shows first frame via `<video preload="metadata">`.
 */
export function ScenePreviewThumb({
  scene,
  className,
  sizes = "116px",
}: {
  scene: Scene
  className?: string
  sizes?: string
}) {
  const thumb = scene.thumbnail?.trim()
  const video = sceneListVideoUrl(scene)

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-md border border-border/60 bg-muted/30",
        className,
      )}
    >
      {thumb ? (
        <Image src={thumb} alt={scene.title} fill className="object-cover" sizes={sizes} />
      ) : video ? (
        <video
          src={videoThumbSrc(video)}
          muted
          playsInline
          preload="metadata"
          className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover"
          aria-hidden
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
          <Clapperboard className="h-6 w-6 opacity-60" aria-hidden />
        </div>
      )}
    </div>
  )
}
