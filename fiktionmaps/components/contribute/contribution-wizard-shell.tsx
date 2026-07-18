"use client"

import { ArrowLeft, ArrowRight } from "lucide-react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface ContributionWizardStepDotsProps {
  /** Índice del paso actual (0-based). */
  currentIndex: number
  totalSteps: number
  className?: string
}

/** Indicador tipo onboarding: puntos centrados, separados del CTA. */
export function ContributionWizardStepDots({ currentIndex, totalSteps, className }: ContributionWizardStepDotsProps) {
  const t = useTranslations("Contribute")
  const safeTotal = Math.max(0, totalSteps)
  const safeIndex = safeTotal === 0 ? 0 : Math.max(0, Math.min(currentIndex, safeTotal - 1))
  return (
    <div
      className={cn("flex flex-wrap justify-center gap-2 py-0.5", className)}
      role="tablist"
      aria-label={t("progressAriaLabel")}
    >
      {Array.from({ length: safeTotal }, (_, i) => {
        const active = i === safeIndex
        return (
          <span
            key={i}
            role="presentation"
            className={cn(
              "rounded-full transition-[width,height,background-color] duration-200 ease-out",
              active ? "h-2 w-8 bg-foreground" : "h-1.5 w-1.5 bg-muted-foreground/30",
            )}
            aria-current={active ? "step" : undefined}
          />
        )
      })}
    </div>
  )
}

/** Navegación fija en el pie (Anterior | puntos | Siguiente / Enviar). */
export interface ContributionWizardFooterNavProps {
  showBack: boolean
  onBack: () => void
  backLabel?: string
  isLastStep: boolean
  onNext: () => void
  onSubmit: () => void
  nextLabel?: string
  submitLabel?: string
  disabled?: boolean
  loading?: boolean
  showTrailingArrow?: boolean
  /** Segundo CTA a la izquierda del botón principal (p. ej. Finish junto a Next). */
  secondaryCta?: {
    label: string
    onClick: () => void
  }
}

function ContributionWizardFooterBack({
  showBack,
  onBack,
  backLabel,
  loading,
}: Pick<ContributionWizardFooterNavProps, "showBack" | "onBack" | "backLabel" | "loading">) {
  const t = useTranslations("Contribute.nav")
  const back = backLabel ?? t("previous")
  if (!showBack) {
    return <span className="min-w-0 shrink-0" aria-hidden />
  }
  return (
    <button
      type="button"
      onClick={onBack}
      disabled={loading}
      className="inline-flex min-h-9 max-w-full shrink-0 items-center gap-1.5 text-sm text-muted-foreground transition-opacity hover:opacity-70 disabled:opacity-40"
    >
      <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
      <span className="truncate">{back}</span>
    </button>
  )
}

function ContributionWizardFooterCta({
  isLastStep,
  onNext,
  onSubmit,
  nextLabel,
  submitLabel,
  disabled = false,
  loading = false,
  showTrailingArrow = false,
}: Pick<
  ContributionWizardFooterNavProps,
  "isLastStep" | "onNext" | "onSubmit" | "nextLabel" | "submitLabel" | "disabled" | "loading" | "showTrailingArrow"
>) {
  const t = useTranslations("Contribute.nav")
  const next = nextLabel ?? t("next")
  const submit = submitLabel ?? t("submitForReview")
  const busy = disabled || loading
  const canAct = !busy

  return (
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
}

export interface ContributionWizardShellProps {
  children: React.ReactNode
  /** Barra inferior legacy (si no usás `footerNav`). */
  navigation?: React.ReactNode
  /**
   * Anterior (izq.) · puntos (centro) · Siguiente/Enviar (der.), siempre visibles al hacer scroll.
   * Si se define, tiene prioridad sobre `navigation` en el pie.
   */
  footerNav?: ContributionWizardFooterNavProps
  /** 0-based índice del paso principal (p. ej. encabezados “paso N de M”). */
  stepIndex: number
  totalSteps: number
  /**
   * Si se pasan, el indicador de puntos del footer usa estos valores (p. ej. subpasos de identidad
   * que no cambian `stepIndex` macro). Por defecto coinciden con `stepIndex` / `totalSteps`.
   */
  progressDotsIndex?: number
  progressDotsTotal?: number
  /** Si es `false`, no se muestran los puntos de progreso (p. ej. pantalla previa al wizard). */
  showProgressDots?: boolean
  footerHint?: string
  /** Ancho máximo del contenido scrolleable: `max-w-md` (compacto) | `max-w-4xl`. */
  contentMaxWidthClassName?: string
  /** Clases extra en el contenedor interno del scroll (p. ej. ajuste fino de márgenes). */
  contentInnerClassName?: string
  /** Ref al div scrolleable interno, útil para resetear el scroll desde el padre. */
  scrollRef?: React.RefObject<HTMLDivElement | null>
  className?: string
}

/**
 * Columna del wizard dentro del main de `FictionContributeLayout` (scroll interno + pie fijo).
 * Los rails complementarios van en `leftAside` / `rightAside` de ese layout, no aquí.
 */
export function ContributionWizardShell({
  children,
  navigation,
  footerNav,
  footerHint,
  stepIndex,
  totalSteps,
  progressDotsIndex,
  progressDotsTotal,
  showProgressDots = true,
  contentMaxWidthClassName = "max-w-md",
  contentInnerClassName,
  scrollRef,
  className,
}: ContributionWizardShellProps) {
  const dotsIndex = progressDotsIndex ?? stepIndex
  const dotsTotal = progressDotsTotal ?? totalSteps

  const useStickyFooterBar = footerNav != null

  return (
    <div
      className={cn("flex h-full min-h-0 w-full min-w-0 flex-col bg-background text-foreground", className)}
    >
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain">
        <div
          className={cn("mx-auto w-full px-4 pb-4 sm:pb-6", contentInnerClassName, contentMaxWidthClassName)}
        >
          {children}
        </div>
      </div>

      {useStickyFooterBar ? (
        <footer className="relative z-10 shrink-0 bg-background">
          <div className="h-px w-full bg-border/60" aria-hidden />
          {footerHint ? (
            <p className="px-4 pt-2 text-center text-xs text-muted-foreground">{footerHint}</p>
          ) : null}
          <div className="grid w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-2 gap-y-1 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <div className="flex min-w-0 justify-start">
              <ContributionWizardFooterBack
                showBack={footerNav.showBack}
                onBack={footerNav.onBack}
                backLabel={footerNav.backLabel}
                loading={footerNav.loading}
              />
            </div>
            <div className="flex justify-center px-1">
              {showProgressDots ? (
                <ContributionWizardStepDots currentIndex={dotsIndex} totalSteps={dotsTotal} />
              ) : (
                <span className="block min-h-[1.25rem] w-px shrink-0" aria-hidden />
              )}
            </div>
            <div className="flex min-w-0 justify-end gap-2">
              {footerNav.secondaryCta ? (
                <Button
                  type="button"
                  variant="outline"
                  size="default"
                  onClick={footerNav.secondaryCta.onClick}
                  disabled={footerNav.loading}
                  className="h-9 w-fit shrink-0 rounded-lg px-4 text-sm font-medium"
                >
                  {footerNav.secondaryCta.label}
                </Button>
              ) : null}
              <ContributionWizardFooterCta
                isLastStep={footerNav.isLastStep}
                onNext={footerNav.onNext}
                onSubmit={footerNav.onSubmit}
                nextLabel={footerNav.nextLabel}
                submitLabel={footerNav.submitLabel}
                disabled={footerNav.disabled}
                loading={footerNav.loading}
                showTrailingArrow={footerNav.showTrailingArrow}
              />
            </div>
          </div>
        </footer>
      ) : (
        <footer className="relative z-10 shrink-0 bg-background px-4 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {footerHint ? (
            <p className="mb-2 text-center text-xs text-muted-foreground">{footerHint}</p>
          ) : null}
          {navigation ? <div className="mb-3">{navigation}</div> : null}
          {showProgressDots ? (
            <ContributionWizardStepDots currentIndex={dotsIndex} totalSteps={dotsTotal} />
          ) : null}
        </footer>
      )}
    </div>
  )
}
