"use client"

import { cn } from "@/lib/utils"

export interface WizardStep {
  title: string
  description?: string
}

interface WizardStepsProps {
  steps: WizardStep[]
  currentStep: number
}

export function WizardSteps({ steps, currentStep }: WizardStepsProps) {
  const total = steps.length
  const activeStep = Math.min(Math.max(currentStep, 0), total - 1)

  return (
    <div className="rounded-xl border border-border bg-card/60 p-4">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Step {activeStep + 1} of {total}</span>
        <span className="font-medium text-foreground/80">{steps[activeStep]?.title}</span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {steps.map((step, idx) => {
          const isDone = idx < activeStep
          const isActive = idx === activeStep
          return (
            <div
              key={step.title}
              className={cn(
                "flex min-w-[160px] flex-1 items-center gap-3 rounded-lg border px-3 py-2 transition-colors",
                isActive && "border-cyan-500/40 bg-cyan-500/5",
                isDone && "border-cyan-500/20 bg-cyan-500/10",
              )}
            >
              <div
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold",
                  isActive && "bg-cyan-500 text-white",
                  isDone && "bg-cyan-500/20 text-cyan-500",
                  !isActive && !isDone && "bg-muted text-muted-foreground",
                )}
              >
                {isDone ? "OK" : idx + 1}
              </div>
              <div className="min-w-0">
                <p className={cn("text-xs font-semibold", isActive ? "text-foreground" : "text-muted-foreground")}>
                  {step.title}
                </p>
                {step.description && (
                  <p className="text-[11px] text-muted-foreground line-clamp-1">{step.description}</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
