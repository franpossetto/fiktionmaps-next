"use client"

import Image from "next/image"
import { Check } from "lucide-react"
import { useTranslations } from "next-intl"
import { useThemeEffectiveBase } from "@/lib/theme-settings-context"
import { getAvatarSrc } from "@/lib/avatars"
import { cn } from "@/lib/utils"

export interface AvatarOption {
  id: string
  label: string
}

export interface OnboardingStepAvatarProps {
  avatars: AvatarOption[]
  selectedAvatar: string
  onSelectAvatar: (id: string) => void
}

export function OnboardingStepAvatar({
  avatars,
  selectedAvatar,
  onSelectAvatar,
}: OnboardingStepAvatarProps) {
  const t = useTranslations("Onboarding")
  const theme = useThemeEffectiveBase()

  return (
    <div className="flex w-full flex-col items-center">
      <div className="mb-12 w-full text-center">
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl md:text-6xl">
          {t("step2Title")}
        </h1>
        <p className="mt-4 text-lg text-muted-foreground sm:text-xl">
          {t("step2Subtitle")}
        </p>
      </div>
      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: `repeat(${Math.min(avatars.length, 4)}, minmax(0, 1fr))` }}
      >
        {avatars.map((avatar) => {
          const active = selectedAvatar === avatar.id
          const src = getAvatarSrc(avatar.id, theme)
          return (
            <button
              key={avatar.id}
              type="button"
              onClick={() => onSelectAvatar(avatar.id)}
              aria-label={t("step2SelectAvatar", { label: avatar.label })}
              className={cn(
                "relative aspect-square w-full overflow-hidden rounded-2xl transition-all duration-200 ring-offset-2 ring-offset-background",
                active
                  ? "ring-2 ring-cyan-500 scale-[1.04]"
                  : "hover:scale-[1.03] opacity-80 hover:opacity-100"
              )}
            >
              <Image
                src={src}
                alt={avatar.label}
                width={400}
                height={400}
                className="h-full w-full object-cover"
              />
              {active && (
                <div className="absolute bottom-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-cyan-500 shadow-md">
                  <Check className="h-3.5 w-3.5 text-white" />
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
