"use client"

import { Check } from "lucide-react"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"
import type { InterestCatalogItem } from "@/src/interests"

export interface OnboardingStepInterestsProps {
  interests: InterestCatalogItem[]
  selectedInterests: string[] // interest ids
  maxSelection: number
  onToggleInterest: (interestId: string) => void
}

export function OnboardingStepInterests({
  interests,
  selectedInterests,
  maxSelection,
  onToggleInterest,
}: OnboardingStepInterestsProps) {
  const t = useTranslations("Onboarding")

  return (
    <div className="flex w-full flex-col items-center">
      <div className="mb-12 w-full text-center">
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl md:text-6xl">
          {t("step4Title")}
        </h1>
      </div>

      <div className="w-full flex flex-wrap gap-2 justify-center">
        {interests.map((interest) => {
          const active = selectedInterests.includes(interest.id)
          return (
            <button
              key={interest.id}
              onClick={() => onToggleInterest(interest.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                active
                  ? "border-foreground bg-foreground text-background"
                  : "bg-muted border-border text-muted-foreground"
              )}
              title={interest.key}
            >
              <span className="inline-flex h-3 w-3 items-center justify-center">
                <Check className={cn("h-3 w-3 transition-opacity", active ? "opacity-100" : "opacity-0")} />
              </span>
              {interest.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

