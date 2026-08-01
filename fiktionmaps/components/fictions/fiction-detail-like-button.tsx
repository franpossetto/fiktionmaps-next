"use client"

import { useEffect, useState } from "react"
import { Heart } from "lucide-react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/auth-context"
import { getMyLikedFictionIdsAction, toggleFictionLikeAction } from "@/src/users/infrastructure/next/user.actions"

export function FictionDetailLikeButton({
  fictionId,
  initialLikeCount,
  initialLiked = false,
}: {
  fictionId: string
  initialLikeCount: number
  initialLiked?: boolean
}) {
  const t = useTranslations("Fictions")
  const { user, isAuthReady } = useAuth()
  const [liked, setLiked] = useState(initialLiked)
  const [likeCount, setLikeCount] = useState(initialLikeCount)
  const [likeBusy, setLikeBusy] = useState(false)

  useEffect(() => {
    setLikeCount(initialLikeCount)
  }, [fictionId, initialLikeCount])

  useEffect(() => {
    if (!isAuthReady) return
    if (!user) {
      setLiked(false)
      return
    }
    // Prefer SSR value when present; refresh after auth ready for session accuracy.
    let cancelled = false
    getMyLikedFictionIdsAction()
      .then((ids) => {
        if (!cancelled) setLiked(ids.includes(fictionId))
      })
      .catch(() => {
        if (!cancelled) setLiked(false)
      })
    return () => {
      cancelled = true
    }
  }, [isAuthReady, user, fictionId])

  if (!user) return null

  async function handleToggleLike() {
    if (!user || likeBusy) return
    const wasLiked = liked
    const prevCount = likeCount
    setLikeBusy(true)
    setLiked(!wasLiked)
    setLikeCount(wasLiked ? Math.max(0, prevCount - 1) : prevCount + 1)
    try {
      const result = await toggleFictionLikeAction(fictionId)
      if (!result.success) {
        setLiked(wasLiked)
        setLikeCount(prevCount)
        return
      }
      setLiked(result.liked)
      setLikeCount(result.likeCount)
    } catch {
      setLiked(wasLiked)
      setLikeCount(prevCount)
    } finally {
      setLikeBusy(false)
    }
  }

  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={handleToggleLike}
      disabled={likeBusy}
      aria-label={liked ? t("unlike") : t("like")}
      className="gap-1.5"
    >
      <Heart className={`h-4 w-4 ${liked ? "text-rose-500" : ""}`} fill={liked ? "currentColor" : "none"} />
      {likeCount > 0 && <span className="text-xs tabular-nums">{likeCount}</span>}
    </Button>
  )
}
