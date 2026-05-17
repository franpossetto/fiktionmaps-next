import Image from "next/image"
import { Clapperboard } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Scene } from "@/src/scenes/domain/scene.entity"

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
  const video = scene.videoUrl?.trim()

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
          src={video}
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
