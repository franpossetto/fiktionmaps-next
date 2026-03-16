"use client"

import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"

export interface OnboardingStepWelcomeProps {
  username: string
  usernameError: string | null
  usernameAvailable: boolean | null
  usernameChecking: boolean
  onUsernameChange: (value: string) => void
}

export function OnboardingStepWelcome({
  username,
  usernameError,
  usernameAvailable,
  usernameChecking,
  onUsernameChange,
}: OnboardingStepWelcomeProps) {
  const t = useTranslations("Onboarding")

  return (
    <div className="flex w-full max-w-lg flex-col items-center">
      <div className="mb-12 w-full text-center">
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl md:text-6xl">
          {t("step1Greeting")}
        </h1>
        <p className="mt-4 text-lg text-muted-foreground sm:text-xl">
          {t("step1Subtitle")}
        </p>
      </div>
      <div className="w-full space-y-2">
        <label className="sr-only" htmlFor="onboarding-username">
          {t("step1UsernameLabel")}
        </label>
        <div className="relative">
          <input
            id="onboarding-username"
            type="text"
            value={username}
            onChange={(e) => onUsernameChange(e.target.value)}
            placeholder={t("step1Placeholder")}
            className={cn(
              "w-full rounded-xl border bg-card pl-4 pr-28 py-3.5 text-base outline-none transition-[border-color,box-shadow,color] placeholder:text-muted-foreground focus:ring-2",
              usernameError
                ? "border-destructive focus:border-destructive focus:ring-destructive/30"
                : usernameAvailable === true
                  ? "border-emerald-500 text-emerald-600 focus:border-emerald-500 focus:ring-emerald-500/30"
                  : "border-border focus:border-foreground focus:ring-foreground/20"
            )}
          />
          {usernameChecking && (
            <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-xs font-medium text-muted-foreground">
              {t("step1Checking")}
            </span>
          )}
          {!usernameChecking && usernameAvailable === true && !usernameError && (
            <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-xs font-medium text-emerald-500">
              {t("step1LooksGreat")}
            </span>
          )}
        </div>
        <p className="text-center text-xs text-muted-foreground">
          {t("step1Rules")}
        </p>
        {usernameError && (
          <p className="text-center text-sm text-destructive">{usernameError}</p>
        )}
      </div>
    </div>
  )
}
