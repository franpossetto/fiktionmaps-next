"use client"

import type { LucideIcon } from "lucide-react"
import { Clapperboard, Clock, Eye, FileText, Film, MapPinned, MapPin, PenLine } from "lucide-react"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"

export type SceneContributeFormStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8

type RailItem = {
  id: string
  step: SceneContributeFormStep
  label: string
  Icon: LucideIcon
}

export interface SceneContributeStepsAsideProps {
  step: SceneContributeFormStep
  onNavigate?: (step: SceneContributeFormStep) => void
  className?: string
}

const stepRowBase =
  "grid min-w-0 w-full grid-cols-[auto_1fr] gap-x-2 rounded-md px-1 py-1 text-left text-xs transition-colors duration-150 sm:text-sm"

export function SceneContributeStepsAside({ step, onNavigate, className }: SceneContributeStepsAsideProps) {
  const t = useTranslations("Contribute.scene")

  const steps: RailItem[] = [
    { id: "fiction", step: 1, label: t("stepFiction"), Icon: Film },
    { id: "place", step: 2, label: t("stepPlaces"), Icon: MapPin },
    { id: "order", step: 3, label: t("stepPlaceOrder"), Icon: MapPinned },
    { id: "video", step: 4, label: t("stepVideo"), Icon: Clapperboard },
    { id: "title", step: 5, label: t("stepTitle"), Icon: PenLine },
    { id: "moment", step: 6, label: t("stepMoment"), Icon: Clock },
    { id: "description", step: 7, label: t("stepDescription"), Icon: FileText },
    { id: "preview", step: 8, label: t("stepPreview"), Icon: Eye },
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
              <span
                className={cn(
                  "flex shrink-0 items-center justify-center self-start pt-[0.15em]",
                  active ? "text-foreground" : "text-muted-foreground",
                )}
                aria-hidden
              >
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
