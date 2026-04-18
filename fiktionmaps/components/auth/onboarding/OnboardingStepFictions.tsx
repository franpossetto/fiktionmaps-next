"use client"

import Image from "next/image"
import { Check } from "lucide-react"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"
import { DEFAULT_FICTION_COVER } from "@/lib/constants/placeholders"
import type { FictionWithMedia } from "@/src/fictions/domain/fiction.entity"

export interface OnboardingStepFictionsProps {
  fictions: FictionWithMedia[]
  selectedFictions: string[]
  maxSelection: number
  onToggleFiction: (id: string) => void
}

export function OnboardingStepFictions({
  fictions,
  selectedFictions,
  maxSelection,
  onToggleFiction,
}: OnboardingStepFictionsProps) {
  const t = useTranslations("Onboarding")

  return (
    <div className="flex w-full flex-col items-center">
      <div className="mb-12 w-full text-center">
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl md:text-6xl">
          {t("step5Title")}
        </h1>
        <p className="mt-4 text-lg text-muted-foreground sm:text-xl max-w-xl mx-auto">
          {t("step5Subtitle")}
        </p>
      </div>
      <div className="w-full grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 max-h-[65vh] min-h-[240px] overflow-y-auto overflow-x-hidden pr-1 pb-2 overscroll-contain">
        {fictions.map((fiction) => {
          const active = selectedFictions.includes(fiction.id)
          return (
            <button
              key={fiction.id}
              onClick={() => onToggleFiction(fiction.id)}
              className={cn(
                "group flex flex-col rounded-xl overflow-hidden text-left transition-all border",
                active
                  ? "ring-2 ring-cyan-500 border-cyan-500 bg-cyan-500/5"
                  : "border-border bg-card hover:border-muted-foreground/40"
              )}
              title={`${fiction.title}${fiction.year ? ` (${fiction.year})` : ""}`}
            >
              <div className="relative w-full aspect-[2/3] overflow-hidden bg-muted">
                <Image
                  src={fiction.coverImage?.trim() || DEFAULT_FICTION_COVER}
                  alt={fiction.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, (max-width: 1024px) 20vw, 16vw"
                />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-2 opacity-0 transition-opacity group-hover:opacity-100">
                  <p className="truncate text-xs font-semibold text-white">{fiction.title}</p>
                  {fiction.year != null && (
                    <p className="text-[11px] text-white/80">{fiction.year}</p>
                  )}
                </div>
                {active && (
                  <div className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-cyan-500 shadow-md">
                    <Check className="h-3.5 w-3.5 text-white" />
                  </div>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
