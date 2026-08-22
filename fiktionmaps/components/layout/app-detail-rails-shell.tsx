import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export interface AppDetailRailsShellProps {
  /** Center column (main content). */
  children: ReactNode
  /** Left rail (e.g. summary card). Hidden below the 1200px container breakpoint. */
  leftAside?: ReactNode
  /** Right rail (e.g. meta lists). Hidden below the 1500px container breakpoint. */
  rightAside?: ReactNode
  /**
   * Sin columna izquierda: misma cuadrícula que detalle pero solo pistas | main (920px) | right (266px) | pista.
   * Equivalente a las columnas 3 (principal) y 4 (complementaria) del layout de fiction, sin la 2.
   */
  mainAndRightOnly?: boolean
  /**
   * Si es `false`, la columna central no usa `overflow-y-auto` (p. ej. wizard con scroll y pie interno).
   */
  mainColumnScroll?: boolean
  /**
   * Where vertical scroll lives:
   *  - `"main"` (default): only the center column scrolls; rails stay visually fixed.
   *  - `"page"`: the whole shell scrolls; consumers can wrap aside content in
   *    `position: sticky` to pin it during scroll.
   */
  scrollMode?: "main" | "page"
}

/**
 * Shared 5-column grid for detail-style and listing pages.
 *
 * Tracks: outer margin | left rail | main | right rail | outer margin.
 * Driven by container queries on the shell (`@container/rails`):
 *   - <  920px: single column, main fills width.
 *   -  920px –1199: outer margins + main (920px); rails hidden.
 *   - 1200px –1499: outer margins + left rail + main; right rail hidden.
 *   - >=1500px: all five columns; outer margins absorb extra space (1fr).
 *
 * Con `mainAndRightOnly`: sin rail izquierdo; pistas | main (920px) | pistas, y desde 1500px
 * pistas | main (920px) | right (266px) | pistas (columnas 3 y 4 alineadas al detalle de fiction).
 *
 * Inner column widths are fixed in px so the main column does not change size when
 * the rails appear/disappear; the 1fr outer tracks expand/shrink with the viewport.
 */
const RAILS_GRID_COLUMNS =
  "grid-cols-1 @[920px]/rails:[grid-template-columns:1fr_920px_1fr] @[1200px]/rails:[grid-template-columns:1fr_266px_920px_1fr] @[1600px]/rails:[grid-template-columns:1fr_266px_920px_320px_1fr] @[1900px]/rails:[grid-template-columns:1fr_266px_920px_420px_1fr]"

const RAILS_GRID_COLUMNS_MAIN_RIGHT_ONLY =
  "grid-cols-1 @[920px]/rails:[grid-template-columns:1fr_920px_1fr] @[1600px]/rails:[grid-template-columns:1fr_920px_320px_1fr] @[1900px]/rails:[grid-template-columns:1fr_920px_420px_1fr]"

export function AppDetailRailsShell({
  children,
  leftAside,
  rightAside,
  mainAndRightOnly = false,
  mainColumnScroll = true,
  scrollMode = "main",
}: AppDetailRailsShellProps) {
  const isPageScroll = scrollMode === "page"
  const gridCols = mainAndRightOnly ? RAILS_GRID_COLUMNS_MAIN_RIGHT_ONLY : RAILS_GRID_COLUMNS
  const mainOverflowClass = isPageScroll
    ? ""
    : mainColumnScroll
      ? "overflow-y-auto"
      : "overflow-hidden flex flex-col"
  return (
    <div
      className={cn(
        "@container/rails bg-background",
        isPageScroll ? "h-full overflow-y-auto" : "flex h-full min-h-0 flex-col",
      )}
    >
      <div
        className={cn(
          "mx-auto grid w-full max-w-[1900px]",
          isPageScroll ? "min-h-full" : "h-full min-h-0",
          gridCols,
        )}
      >
        <div className="hidden min-h-0 @[920px]/rails:block" aria-hidden />
        {!mainAndRightOnly ? (
          <aside className="hidden min-h-0 border-r border-border/50 pl-1 @[1200px]/rails:block">
            {leftAside ?? null}
          </aside>
        ) : null}
        {isPageScroll ? (
          <div className="min-w-0 border-x border-border/50 max-lg:min-h-full @[1200px]/rails:border-x-0">
            {children}
            {rightAside && (
              <div className="border-t border-border/50 p-5 @[1600px]/rails:hidden">
                {rightAside}
              </div>
            )}
          </div>
        ) : (
          <div
            data-detail-main-scroll
            className={cn("min-h-0 h-full min-w-0 bg-background", mainOverflowClass)}
          >
            {children}
            {rightAside && (
              <div className="border-t border-border/50 p-5 @[1600px]/rails:hidden">
                {rightAside}
              </div>
            )}
          </div>
        )}
        <aside className="hidden min-h-0 border-l border-border/50 px-5 py-10 @[1600px]/rails:flex @[1600px]/rails:flex-col">
          {rightAside ?? null}
        </aside>
        <div className="hidden min-h-0 @[920px]/rails:block" aria-hidden />
      </div>
    </div>
  )
}
