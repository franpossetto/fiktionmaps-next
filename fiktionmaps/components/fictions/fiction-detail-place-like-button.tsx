"use client"

import { useState } from "react"
import { Heart } from "lucide-react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"

/** Local-only stub until place likes are wired server-side. */
export function FictionDetailPlaceLikeButton({ placeId }: { placeId: string }) {
  const t = useTranslations("Fictions")
  const [liked, setLiked] = useState(false)

  return (
    <Button
      size="sm"
      variant="secondary"
      className="h-9 w-9 p-0"
      aria-label={liked ? t("unlikePlace") : t("likePlace")}
      onClick={() => setLiked((v) => !v)}
      data-place-id={placeId}
    >
      <Heart className={`h-4 w-4 ${liked ? "text-rose-500" : ""}`} fill={liked ? "currentColor" : "none"} />
    </Button>
  )
}
