"use client"

import * as React from "react"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { useThemeEffectiveBase } from "@/lib/theme-settings-context"
import { getAvatarSrc } from "@/lib/avatars"
import { cn } from "@/lib/utils"

interface UserAvatarProps {
  /** Value stored in profiles.avatar_url: a known avatar ID, an HTTP bucket URL, or null. */
  avatarId: string | null | undefined
  /** Fallback text (usually the first letter of the username). */
  fallback: string
  className?: string
}

export function UserAvatar({ avatarId, fallback, className }: UserAvatarProps) {
  const theme = useThemeEffectiveBase()
  const src = getAvatarSrc(avatarId, theme)
  const showImage = src !== "/logo-icon.png"

  // Track image load status so we show a skeleton while it loads instead of
  // flashing the initials fallback (which only makes sense if the image fails).
  const [status, setStatus] = React.useState<"loading" | "loaded" | "error">(
    showImage ? "loading" : "error",
  )

  React.useEffect(() => {
    setStatus(showImage ? "loading" : "error")
  }, [src, showImage])

  return (
    <Avatar className={cn(className)}>
      {showImage && (
        <AvatarImage
          key={src}
          src={src}
          alt=""
          onLoadingStatusChange={(s) => {
            if (s === "loaded") setStatus("loaded")
            else if (s === "error") setStatus("error")
          }}
        />
      )}
      {status === "loading" ? (
        <AvatarFallback className="animate-pulse bg-muted" delayMs={0}>
          <span className="sr-only">{fallback}</span>
        </AvatarFallback>
      ) : status === "error" ? (
        <AvatarFallback className="text-sm font-semibold uppercase">{fallback}</AvatarFallback>
      ) : null}
    </Avatar>
  )
}
