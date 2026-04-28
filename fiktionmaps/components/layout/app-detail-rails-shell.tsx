import type { ReactNode } from "react"

export interface AppDetailRailsShellProps {
  /** Center column (main content). */
  children: ReactNode
  /** Left rail (e.g. summary card). Hidden below `lg`; keeps grid track when empty. */
  leftAside?: ReactNode
  /** Right rail (e.g. meta lists). Hidden below `xl`; fourth grid track is 0% at `lg`. */
  rightAside?: ReactNode
}

/**
 * Shared 5-column grid for detail-style pages (fiction, future place/city).
 *
 * Tracks (lg / xl): outer margin | left rail | main | right rail | outer margin.
 * At `lg` the fourth track is 0% so the right aside is not shown; at `xl` it gains width.
 *
 * Scroll lives only on the main column (`[data-detail-main-scroll]`) so left/right rails stay fixed.
 */
export function AppDetailRailsShell({ children, leftAside, rightAside }: AppDetailRailsShellProps) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="mx-auto grid h-full min-h-0 w-full max-w-[1900px] grid-cols-1 lg:[grid-template-columns:13%_14%_61%_0%_12%] xl:[grid-template-columns:13%_14%_47%_14%_12%]">
        <div className="hidden min-h-0 lg:block" aria-hidden />
        <aside className="hidden min-h-0 border-r border-border/50 pl-1 lg:block">{leftAside ?? null}</aside>
        <div data-detail-main-scroll className="min-h-0 h-full overflow-y-auto bg-background">
          {children}
        </div>
        <aside className="hidden min-h-0 border-l border-border/50 px-5 py-10 xl:block">{rightAside ?? null}</aside>
        <div className="hidden min-h-0 lg:block" aria-hidden />
      </div>
    </div>
  )
}
