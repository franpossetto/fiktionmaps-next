import type { ReactNode } from "react"
import { FictionSidebarCard } from "@/components/fictions/fiction-sidebar-card"
import { AppDetailRailsShell } from "@/components/layout/app-detail-rails-shell"
import type { FictionWithMedia } from "@/src/fictions/domain/fiction.entity"

/** Matches fiction slug detail (`/fictions/[slug]`). */
export const FICTION_SLUG_DETAIL_SIDEBAR_WIDTH_PX = 148
export const FICTION_SLUG_DETAIL_SIDEBAR_RIGHT_GAP_PX = 20

export function FictionSlugDetailShell({
  fiction,
  summaryText,
  rightAside,
  children,
}: {
  fiction: FictionWithMedia
  summaryText?: string
  rightAside?: ReactNode
  children: ReactNode
}) {
  return (
    <AppDetailRailsShell
      leftAside={
        <FictionSidebarCard
          fiction={fiction}
          align="right"
          containerWidthPx={FICTION_SLUG_DETAIL_SIDEBAR_WIDTH_PX}
          rightOffsetPx={FICTION_SLUG_DETAIL_SIDEBAR_RIGHT_GAP_PX}
          summaryText={summaryText}
        />
      }
      rightAside={rightAside}
    >
      {children}
    </AppDetailRailsShell>
  )
}
