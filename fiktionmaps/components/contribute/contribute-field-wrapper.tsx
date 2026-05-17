"use client"

import type React from "react"
import { cn } from "@/lib/utils"

interface ContributeFieldWrapperProps {
  label: string
  required?: boolean
  error?: string
  hint?: string
  /** Color del texto de ayuda bajo el control (p. ej. contador sugerido). */
  hintTone?: "default" | "success" | "warning"
  children: React.ReactNode
  className?: string
}

/**
 * Campos compactos: label semibold + control + error (wizard contribuir).
 */
export function ContributeFieldWrapper({
  label,
  required,
  error,
  hint,
  hintTone = "default",
  children,
  className,
}: ContributeFieldWrapperProps) {
  const hintClass =
    hintTone === "success"
      ? "text-emerald-600 dark:text-emerald-400"
      : hintTone === "warning"
        ? "text-amber-600 dark:text-amber-500"
        : "text-muted-foreground"

  return (
    <div className={cn("flex flex-col", className)}>
      <label className="mb-1 block text-sm font-semibold leading-snug text-foreground">
        {label}
        {required ? <span className="ml-0.5 text-destructive">*</span> : null}
      </label>
      {children}
      {error ? <p className="mt-1.5 text-xs text-destructive">{error}</p> : null}
      {hint ? <p className={cn("mt-1.5 text-xs font-medium", hintClass)}>{hint}</p> : null}
    </div>
  )
}
