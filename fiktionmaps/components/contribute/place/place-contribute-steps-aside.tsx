"use client"

import type { LucideIcon } from "lucide-react"
import { BookOpen, Eye, FileImage, FileText, MapPin, PenLine, ScanEye } from "lucide-react"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"

export type PlaceContributeFormStep = 1 | 2 | 3 | 4 | 5 | 6 | 7

type RailItem = {
  id: string
  step: PlaceContributeFormStep
  label: string
  Icon: LucideIcon
}

export interface PlaceContributeStepsAsideProps {
  step: PlaceContributeFormStep
  onNavigate?: (step: PlaceContributeFormStep) => void
  className?: string
}

const stepRowBase =
  "grid min-w-0 w-full grid-cols-[auto_1fr] gap-x-2 rounded-md px-1 py-1 text-left text-xs transition-colors duration-150 sm:text-sm"

export function PlaceContributeStepsAside({ step, onNavigate, className }: PlaceContributeStepsAsideProps) {
  const t = useTranslations("Contribute.place")

  const steps: RailItem[] = [
    { id: "fiction", step: 1, label: t("stepFiction"), Icon: BookOpen },
    { id: "location", step: 2, label: t("stepLocation"), Icon: MapPin },
    { id: "details", step: 3, label: t("stepDetails"), Icon: PenLine },
    { id: "photo", step: 4, label: t("stepPhoto"), Icon: FileImage },
    { id: "streetView", step: 5, label: t("stepStreetView"), Icon: ScanEye },
    { id: "description", step: 6, label: t("stepDescription"), Icon: FileText },
    { id: "preview", step: 7, label: t("stepPreview"), Icon: Eye },
  ]

  return (
    <nav className={cn("ml-auto w-full min-w-0 max-w-full space-y-3", className)} aria-label={t("stepsAsideAria")}>
      <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{t("stepsAsideHeading")}</h2>
      <ol className="space-y-1">
        {steps.map((item) => {
          const active = item.step === step
          const StepIcon = item.Icon
          const interactive = Boolean(onNavigate)
          const rowClass = cn(
            stepRowBase,
            active ? "bg-muted/80 text-foreground" : "text-muted-foreground",
            interactive &&
              "cursor-pointer hover:bg-muted/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          )
          const content = (
            <>
              <span className={cn("flex shrink-0 items-center justify-center self-start pt-[0.15em]", active ? "text-foreground" : "text-muted-foreground")} aria-hidden>
                <StepIcon className="h-4 w-4 shrink-0 stroke-[1.75]" />
              </span>
              <span className={cn("min-w-0 leading-snug", active ? "font-medium" : "")}>{item.label}</span>
            </>
          )
          return (
            <li key={item.id} aria-current={active ? "step" : undefined}>
              {interactive ? (
                <button
                  type="button"
                  className={rowClass}
                  aria-label={t("stepsAsideNavJump", { label: item.label })}
                  onClick={() => onNavigate?.(item.step)}
                >
                  {content}
                </button>
              ) : (
                <div className={rowClass}>{content}</div>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
