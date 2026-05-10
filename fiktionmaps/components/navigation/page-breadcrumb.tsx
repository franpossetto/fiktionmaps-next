"use client"

import { Fragment } from "react"
import { ChevronRight } from "lucide-react"
import { Link } from "@/i18n/navigation"
import { cn } from "@/lib/utils"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

/** Trail links + chevrons: gris claro / muted */
const trailMutedClass = "text-neutral-500 antialiased dark:text-neutral-400"

export type PageBreadcrumbSegment = {
  label: string
  href?: string
}

type PageBreadcrumbProps = {
  items: PageBreadcrumbSegment[]
  /** Overrides default `aria-label` on `<nav>` (pass translated string). */
  ariaLabel?: string
  className?: string
}

export function PageBreadcrumb({ items, ariaLabel = "breadcrumb", className }: PageBreadcrumbProps) {
  if (items.length === 0) return null

  return (
    <Breadcrumb aria-label={ariaLabel} className={cn("min-w-0", className)}>
      <BreadcrumbList className="items-center gap-x-0 gap-y-0.5 text-xs font-semibold uppercase leading-snug tracking-[0.12em] sm:gap-x-0 sm:gap-y-0.5">
        {items.map((item, index) => (
          <Fragment key={`${index}-${item.href ?? item.label}`}>
            {index > 0 ? (
              <BreadcrumbSeparator
                className={cn("mx-0 flex shrink-0 items-center justify-center px-px", trailMutedClass)}
                aria-hidden
              >
                <ChevronRight className="size-2.5 shrink-0" strokeWidth={2.25} aria-hidden />
              </BreadcrumbSeparator>
            ) : null}
            <BreadcrumbItem className="max-w-[44vw] min-w-0 shrink gap-0 sm:max-w-none">
              {item.href ? (
                <BreadcrumbLink asChild>
                  <Link
                    href={item.href}
                    className={cn(
                      trailMutedClass,
                      "truncate underline-offset-[3px] transition-colors",
                      "hover:text-neutral-700 hover:underline dark:hover:text-neutral-200",
                    )}
                  >
                    {item.label}
                  </Link>
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage className="truncate text-xs font-bold leading-snug text-foreground">
                  {item.label}
                </BreadcrumbPage>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
