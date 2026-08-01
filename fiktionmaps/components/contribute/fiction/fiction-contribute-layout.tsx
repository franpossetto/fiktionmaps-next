import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export interface FictionContributeLayoutProps {
  children: ReactNode
  leftAside?: ReactNode
  rightAside?: ReactNode
  /**
   * Clase del padding superior de la grilla (`pt-[40px]` por defecto, alineado con contribute/fiction).
   * Podés pasar otra clase si una pantalla necesita otro tope.
   */
  gridTopClassName?: string
  /**
   * Si es `false`, la columna central no usa `overflow-y-auto` (p. ej. wizard con scroll interno).
   */
  mainColumnScroll?: boolean
  className?: string
}

/**
 * Misma familia de anchos que `AppDetailRailsShell` / contribute: `globals.css` → `.fiction-contrib-grid`.
 * Tope `max-w-[1900px] mx-auto`; desde 1500px carriles 266px y main 920px (como detalle fiction).
 */
export function FictionContributeLayout({
  children,
  leftAside,
  rightAside,
  gridTopClassName,
  mainColumnScroll = true,
  className,
}: FictionContributeLayoutProps) {
  const mainOverflowClass = mainColumnScroll ? "overflow-y-auto" : "overflow-hidden flex flex-col"

  return (
    <div className={cn("flex h-full min-h-0 w-full min-w-0 flex-col bg-background", className)}>
      <div
        className={cn(
          "fiction-contrib-grid mx-auto min-h-0 w-full max-w-[1900px] flex-1",
          gridTopClassName ?? "pt-[40px]",
        )}
      >
        <div className="fiction-contrib-grid-gutter hidden min-h-0 min-[1500px]:block" aria-hidden />
        <aside className="fiction-contrib-rail-left hidden h-full min-h-0 min-w-0 flex-col border-r border-border/50 bg-background pl-1 pr-2 min-[900px]:flex">
          {leftAside ?? null}
        </aside>
        <div
          data-fiction-contrib-main-scroll
          className={cn("fiction-contrib-main min-h-0 h-full min-w-0 bg-background", mainOverflowClass)}
        >
          {children}
        </div>
        <aside className="fiction-contrib-rail-right hidden h-full min-h-0 min-w-0 flex-col border-l border-border/50 bg-background px-5 min-[900px]:flex">
          {rightAside ?? null}
        </aside>
        <div className="fiction-contrib-grid-gutter hidden min-h-0 min-[1500px]:block" aria-hidden />
      </div>
    </div>
  )
}
