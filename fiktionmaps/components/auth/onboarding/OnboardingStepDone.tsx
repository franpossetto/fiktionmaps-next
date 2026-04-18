"use client"

import { useTranslations } from "next-intl"

export function OnboardingStepDone() {
  const t = useTranslations("Onboarding")

  return (
    <div className="flex w-full flex-col items-center text-center">
      <div className="mb-12 w-full text-center">
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl md:text-6xl">
          {t("step7Title")}
        </h1>
        <p className="mt-4 text-lg text-muted-foreground sm:text-xl">
          {t("step7Subtitle")}
        </p>
      </div>
    </div>
  )
}
