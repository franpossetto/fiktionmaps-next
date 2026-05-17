import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export interface FictionContributeLayoutProps {
  children: ReactNode
  leftAside?: ReactNode
  rightAside?: ReactNode
  /**
   * Si es `false`, la columna central no usa `overflow-y-auto` (p. ej. wizard con scroll interno).
   */
  mainColumnScroll?: boolean
  className?: string
}

/**
 * Tres columnas (izquierda · centro · derecha) reparten el **100%** del ancho del contenedor desde 900px;
 * por debajo, solo la columna central. La plantilla vive en `.fiction-contrib-grid` en `globals.css`.
 *
 * **40px** de padding superior en la grilla (no solo en el main): costados y contenido quedan alineados
 * y evita el conflicto `h-full` + `padding-top` en la misma caja que anula el desplazamiento visual.
 */
export function FictionContributeLayout({
  children,
  leftAside,
  rightAside,
  mainColumnScroll = true,
  className,
}: FictionContributeLayoutProps) {
  const mainOverflowClass = mainColumnScroll ? "overflow-y-auto" : "overflow-hidden flex flex-col"

  return (
    <div className={cn("flex h-full min-h-0 w-full min-w-0 flex-col bg-background", className)}>
      <div className="fiction-contrib-grid min-h-0 flex-1 pt-[40px]">
        <aside className="hidden min-h-0 min-w-0 border-r border-border/50 bg-background pl-5 pr-2 min-[900px]:block">
          {leftAside ?? null}
        </aside>
        <div
          data-fiction-contrib-main-scroll
          className={cn("min-h-0 h-full min-w-0 bg-background", mainOverflowClass)}
        >
          {children}
        </div>
        <aside className="hidden h-full min-h-0 min-w-0 flex-col border-l border-border/50 bg-background px-5 min-[900px]:flex">
          {rightAside ?? null}
        </aside>
      </div>
    </div>
  )
}
