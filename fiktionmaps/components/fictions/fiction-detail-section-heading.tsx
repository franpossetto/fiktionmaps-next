import type { ReactNode } from "react"
import { ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

/** Yellow accent + 3xl title used on fiction / place / scene detail sections. */
export function FictionDetailSectionHeading({
  id,
  title,
  count,
  description,
  trailing,
  className,
}: {
  id?: string
  title: string
  count?: number
  description?: ReactNode
  trailing?: ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="h-7 w-1 shrink-0 rounded-full bg-yellow-500" aria-hidden />
          <h2 id={id} className="text-3xl font-semibold tracking-tight text-foreground">
            {title}
          </h2>
          {count != null ? (
            <span className="text-base font-medium text-muted-foreground">{count}</span>
          ) : null}
          <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
        </div>
        {trailing}
      </div>
      {description != null ? (
        <p className={cn("mt-1.5 text-base text-muted-foreground")}>{description}</p>
      ) : null}
    </div>
  )
}
