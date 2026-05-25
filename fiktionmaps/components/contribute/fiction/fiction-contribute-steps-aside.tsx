"use client"

import type { LucideIcon } from "lucide-react"
import {
  Eye,
  FileImage,
  FileText,
  ImagePlay,
  LayoutTemplate,
  Tags,
  UserRound,
  Users,
} from "lucide-react"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"

export type FictionContributeFormStep = 1 | 2 | 3 | 4 | 5 | 6 | 7

export type FictionContributeStepsNavTarget =
  | { kind: "category" }
  | { kind: "formStep"; step: FictionContributeFormStep }

type RailItem = {
  id: string
  formStep: "category" | FictionContributeFormStep
  label: string
  Icon: LucideIcon
}

export interface FictionContributeStepsAsideProps {
  flowPhase: "category" | "form"
  step: FictionContributeFormStep
  /** When set, step rows in the rail navigate the wizard (form phase and back to work type). */
  onNavigate?: (target: FictionContributeStepsNavTarget) => void
  className?: string
}

const stepRowBase =
  "grid min-w-0 w-full grid-cols-[auto_1fr] gap-x-2 rounded-md px-1 py-1 text-left text-xs transition-colors duration-150 sm:text-sm"

export function FictionContributeStepsAside({
  flowPhase,
  step,
  onNavigate,
  className,
}: FictionContributeStepsAsideProps) {
  const tf = useTranslations("Contribute.fiction")

  const steps: RailItem[] = [
    { id: "type", formStep: "category", label: tf("stepsAsideChooseType"), Icon: LayoutTemplate },
    { id: "basics", formStep: 1, label: tf("identityTitle"), Icon: UserRound },
    { id: "cover", formStep: 2, label: tf("stepsAsideCover"), Icon: FileImage },
    { id: "banner", formStep: 3, label: tf("stepsAsideBanner"), Icon: ImagePlay },
    { id: "classification", formStep: 4, label: tf("classificationTitle"), Icon: Tags },
    { id: "team", formStep: 5, label: tf("teamTitle"), Icon: Users },
    { id: "description", formStep: 6, label: tf("stepsAsideDescription"), Icon: FileText },
    { id: "review", formStep: 7, label: tf("stepsAsideReview"), Icon: Eye },
  ]

  return (
    <nav
      className={cn("ml-auto w-full min-w-0 max-w-full space-y-3", className)}
      aria-label={tf("stepsAsideAria")}
    >
      <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {tf("stepsAsideHeading")}
      </h2>
      <ol className="space-y-1">
        {steps.map((item) => {
          const active =
            flowPhase === "category"
              ? item.formStep === "category"
              : item.formStep !== "category" && item.formStep === step
          const StepIcon = item.Icon

          const typeRowInteractive = Boolean(onNavigate) && item.id === "type" && flowPhase === "form"
          const lockedBeforeForm =
            Boolean(onNavigate) && flowPhase === "category" && item.formStep !== "category"
          const formRowInteractive =
            Boolean(onNavigate) &&
            flowPhase === "form" &&
            item.formStep !== "category" &&
            item.id !== "type"

          const rowInteractive = typeRowInteractive || formRowInteractive

          const rowClass = cn(
            stepRowBase,
            active ? "bg-muted/80 text-foreground" : "text-muted-foreground",
            rowInteractive &&
              "cursor-pointer hover:bg-muted/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            lockedBeforeForm && "cursor-not-allowed opacity-50",
          )

          const stepRowContent = (
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
              {typeRowInteractive ? (
                <button
                  type="button"
                  className={rowClass}
                  aria-label={tf("stepsAsideNavChangeType")}
                  onClick={() => onNavigate?.({ kind: "category" })}
                >
                  {stepRowContent}
                </button>
              ) : item.id === "type" ? (
                <div className={rowClass}>{stepRowContent}</div>
              ) : lockedBeforeForm ? (
                <button
                  type="button"
                  className={rowClass}
                  disabled
                  title={tf("stepsAsideLockedBeforeForm")}
                >
                  {stepRowContent}
                </button>
              ) : formRowInteractive ? (
                <button
                  type="button"
                  className={rowClass}
                  aria-label={tf("stepsAsideNavJump", { label: item.label })}
                  onClick={() =>
                    item.formStep !== "category" && onNavigate?.({ kind: "formStep", step: item.formStep })
                  }
                >
                  {stepRowContent}
                </button>
              ) : (
                <div className={rowClass}>{stepRowContent}</div>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
