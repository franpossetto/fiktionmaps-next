"use client"

import { BookOpen, Link2 } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

type StepItem = { id: string; step: number; label: string; Icon: LucideIcon }

const STEPS: StepItem[] = [
  { id: "fiction", step: 1, label: "Fiction", Icon: BookOpen },
  { id: "source",  step: 2, label: "Source URL", Icon: Link2 },
]

const ROW_BASE =
  "grid min-w-0 w-full grid-cols-[auto_1fr] gap-x-2 rounded-md px-1 py-1 text-xs sm:text-sm"

export function HuntSourceStepsAside({ step, className }: { step: number; className?: string }) {
  return (
    <nav className={cn("ml-auto w-full min-w-0 max-w-full space-y-3", className)} aria-label="Hunt steps">
      <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Steps
      </h2>
      <ol className="space-y-1">
        {STEPS.map((item) => {
          const active = item.step === step
          const Icon = item.Icon
          return (
            <li key={item.id} aria-current={active ? "step" : undefined}>
              <div className={cn(ROW_BASE, active ? "bg-muted/80 text-foreground" : "text-muted-foreground")}>
                <span
                  className={cn("flex shrink-0 items-center justify-center self-start pt-[0.15em]", active ? "text-foreground" : "text-muted-foreground")}
                  aria-hidden
                >
                  <Icon className="h-4 w-4 shrink-0 stroke-[1.75]" />
                </span>
                <span className={cn("min-w-0 leading-snug", active && "font-medium")}>{item.label}</span>
              </div>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
