"use client"

import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/** Right rail copy for the public-page preview step (fiction step 7, place step 6). */
export function ContributePublicPreviewAside({
  title,
  description,
  reviewPendingNote,
  rewardCard,
  className,
}: {
  title: string
  description: string
  reviewPendingNote: string
  rewardCard: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "mx-auto flex h-full min-h-0 w-full max-w-[min(280px,100%)] flex-col self-stretch pb-6",
        className,
      )}
    >
      <div className="min-h-0 shrink-0">
        <h2 className="text-base font-semibold leading-snug text-foreground sm:text-[1.0625rem]">{title}</h2>
        <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">{description}</p>
        <p className="mt-4 text-xs leading-relaxed text-muted-foreground/90">{reviewPendingNote}</p>
      </div>
      <div className="mt-auto shrink-0 pt-5">{rewardCard}</div>
    </div>
  )
}
