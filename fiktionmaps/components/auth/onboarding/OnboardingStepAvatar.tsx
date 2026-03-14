"use client"

import Image from "next/image"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

export interface AvatarOption {
  id: string
  label: string
  url: string
}

export interface OnboardingStepAvatarProps {
  avatars: AvatarOption[]
  selectedAvatar: string
  onSelectAvatar: (url: string) => void
}

export function OnboardingStepAvatar({
  avatars,
  selectedAvatar,
  onSelectAvatar,
}: OnboardingStepAvatarProps) {
  return (
    <div className="flex w-full flex-col items-center">
      <div className="mb-12 w-full text-center">
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl md:text-6xl">
          Choose your avatar
        </h1>
        <p className="mt-4 text-lg text-muted-foreground sm:text-xl">
          Pick the one that feels like you. None fit? Change it anytime — you&apos;re one of a kind.
        </p>
      </div>
      <div className="w-full grid grid-cols-4 gap-3 sm:gap-4 max-h-[280px] sm:max-h-none overflow-y-auto overflow-x-hidden overscroll-contain">
        {avatars.map((avatar) => {
          const active = selectedAvatar === avatar.url
          return (
            <button
              key={avatar.id}
              type="button"
              onClick={() => onSelectAvatar(avatar.url)}
              aria-label={`Select avatar ${avatar.label}`}
              className={cn(
                "relative flex aspect-square w-full min-w-0 items-center justify-center overflow-hidden rounded-xl border-2 transition-all ring-offset-2 ring-offset-background",
                active
                  ? "border-cyan-500 ring-2 ring-cyan-500 bg-cyan-500/5"
                  : "border-border bg-muted hover:border-muted-foreground/50 hover:scale-[1.02]"
              )}
            >
              <Image
                src={avatar.url}
                alt={avatar.label}
                fill
                sizes="(max-width: 640px) 25vw, 25vw"
                className="object-cover"
                unoptimized
              />
              {active && (
                <div className="absolute bottom-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-cyan-500 shadow-md">
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
