"use client"

import { ArrowLeft, ArrowRight } from "lucide-react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ContributeNavigationProps {
  showBack: boolean
  onBack: () => void
  isLastStep: boolean
  onNext: () => void
  onSubmit: () => void
  nextLabel?: string
  submitLabel?: string
  disabled?: boolean
  loading?: boolean
  /** Ancho máximo del bloque de navegación. */
  widthClassName?: string
  className?: string
  /**
   * `stacked`: enlaces arriba, CTA principal abajo alineado al inicio (referencia onboarding).
   * `split`: fila con Anterior a la izquierda y CTA a la derecha.
   */
  layout?: "stacked" | "split"
  /** Mostrar icono de flecha en el CTA (desactivar para un “Siguiente” más limpio). */
  showTrailingArrow?: boolean
  /** Texto del control de retroceso (p. ej. "Volver" en la primera pantalla). */
  backLabel?: string
}

/** Navegación del wizard de contribución (stacked) y variante en fila para otros usos. */
export function ContributeNavigation({
  showBack,
  onBack,
  isLastStep,
  onNext,
  onSubmit,
  nextLabel,
  submitLabel,
  disabled = false,
  loading = false,
  widthClassName = "max-w-md",
  className,
  layout = "split",
  showTrailingArrow = false,
  backLabel,
}: ContributeNavigationProps) {
  const t = useTranslations("Contribute.nav")
  const back = backLabel ?? t("previous")
  const next = nextLabel ?? t("next")
  const submit = submitLabel ?? t("submitForReview")
  const busy = disabled || loading
  const canAct = !busy

  const cta = (
    <Button
      type="button"
      onClick={isLastStep ? onSubmit : onNext}
      disabled={busy}
      variant={canAct ? "default" : "outline"}
      size="default"
        className={cn(
          "h-9 w-fit shrink-0 rounded-lg px-4 text-sm font-medium",
          canAct ? "" : "border border-border bg-background hover:bg-muted",
        )}
    >
      {loading ? t("sending") : isLastStep ? submit : next}
      {showTrailingArrow && !isLastStep ? <ArrowRight className="ml-2 h-4 w-4 shrink-0" aria-hidden /> : null}
    </Button>
  )

  if (layout === "split") {
    return (
      <div className={cn("flex w-full items-center justify-between gap-4", widthClassName, className)}>
        {showBack ? (
          <button
            type="button"
            onClick={onBack}
            disabled={loading}
            className="inline-flex min-h-9 shrink-0 items-center gap-1.5 text-sm text-muted-foreground transition-opacity hover:opacity-70 disabled:opacity-40"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
            {back}
          </button>
        ) : (
          <span className="min-w-0 shrink-0" aria-hidden />
        )}
        {cta}
      </div>
    )
  }

  return (
    <div className={cn("flex w-full flex-col gap-3", widthClassName, className)}>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
        {showBack ? (
          <button
            type="button"
            onClick={onBack}
            disabled={loading}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-opacity hover:opacity-70 disabled:opacity-40"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
            {back}
          </button>
        ) : null}
      </div>
      {cta}
    </div>
  )
}
