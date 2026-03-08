"use client"

import { Button } from "@/components/ui/button"
import { WizardSteps, type WizardStep } from "./wizard-steps"

interface WizardShellProps {
  title: string
  subtitle?: string
  steps: WizardStep[]
  currentStep: number
  fullPage?: boolean
  onBack?: () => void
  backLabel?: string
  onCancel?: () => void
  cancelLabel?: string
  children: React.ReactNode
}

export function WizardShell({
  title,
  subtitle,
  steps,
  currentStep,
  fullPage = true,
  onBack,
  backLabel = "Back",
  onCancel,
  cancelLabel = "Cancel",
  children,
}: WizardShellProps) {
  const content = (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors mb-3"
            >
              {backLabel}
            </button>
          )}
          <h2 className="text-2xl font-bold text-foreground">{title}</h2>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-1">
              {subtitle}
            </p>
          )}
        </div>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            {cancelLabel}
          </Button>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card/40 p-6">
        <div className="space-y-6">
          <WizardSteps steps={steps} currentStep={currentStep} />
          <div>{children}</div>
        </div>
      </div>
    </div>
  )

  if (!fullPage) return content

  return (
    <div className="fixed inset-0 z-[3000] bg-background overflow-y-auto">
      <div className="min-h-screen px-6 py-6">
        <div className="max-w-6xl mx-auto w-full">
          {content}
        </div>
      </div>
    </div>
  )
}
