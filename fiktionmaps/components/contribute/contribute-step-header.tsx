"use client"

import { cn } from "@/lib/utils"

export type ContributeStepBadge = "required" | "enrichment"

interface ContributeStepHeaderProps {
  /** Título principal (misma jerarquía que pasos del onboarding). */
  title: string
  description: string
  badge: ContributeStepBadge
  stepNumber: number
  totalSteps: number
  /** Sub-fase del paso (p. ej. identidad: datos vs imágenes). */
  phaseLabel?: string
  /**
   * `minimal`: título y texto alineados a la izquierda, sin “Paso n de N” ni párrafo de badge;
   * progreso solo en el footer del wizard (puntos).
   */
  variant?: "default" | "minimal"
}

/**
 * Encabezado alineado al flujo de onboarding: kicker, display grande centrado, subtítulo.
 * @see `components/auth/onboarding/OnboardingStepAbout.tsx`
 */
export function ContributeStepHeader({
  title,
  description,
  badge,
  stepNumber,
  totalSteps,
  phaseLabel,
  variant = "default",
}: ContributeStepHeaderProps) {
  if (variant === "minimal") {
    return (
      <div className="mb-5 w-full text-left sm:mb-6">
        {phaseLabel ? (
          <p className="mb-1.5 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
            {phaseLabel}
          </p>
        ) : null}
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">{description}</p>
      </div>
    )
  }

  return (
    <div className="mb-10 w-full text-center sm:mb-12">
      <p className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
        Paso {stepNumber} de {totalSteps}
      </p>
      {phaseLabel ? (
        <p className="mb-2 text-sm font-medium text-foreground/90">{phaseLabel}</p>
      ) : null}
      <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl md:text-6xl">
        {title}
      </h1>
      <p className="mt-4 text-lg text-muted-foreground sm:text-xl">{description}</p>
      <p
        className={cn(
          "mt-3 text-sm",
          badge === "required" ? "text-foreground/80" : "text-muted-foreground",
        )}
      >
        {badge === "required"
          ? "Este paso es obligatorio: completá todos los campos para continuar."
          : "Paso opcional — podés saltearlo cuando quieras."}
      </p>
    </div>
  )
}
