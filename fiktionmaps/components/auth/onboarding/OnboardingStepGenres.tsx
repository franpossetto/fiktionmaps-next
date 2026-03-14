"use client"

import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

export interface OnboardingStepGenresProps {
  genres: string[]
  selectedGenres: string[]
  maxSelection: number
  onToggleGenre: (genre: string) => void
}

export function OnboardingStepGenres({
  genres,
  selectedGenres,
  maxSelection,
  onToggleGenre,
}: OnboardingStepGenresProps) {
  return (
    <div className="flex w-full flex-col items-center">
      <div className="mb-12 w-full text-center">
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl md:text-6xl">
          Tell us what you love?
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {selectedGenres.length === 0
            ? "None selected"
            : `Selected ${selectedGenres.length}`}
          {" · "}
          <span className="font-medium text-foreground">{selectedGenres.length}/{maxSelection}</span>
        </p>
      </div>
      <div className="w-full flex flex-wrap gap-2 justify-center">
        {genres.map((genre) => {
          const active = selectedGenres.includes(genre)
          return (
            <button
              key={genre}
              onClick={() => onToggleGenre(genre)}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all border",
                active
                  ? "bg-cyan-500/10 border-cyan-500 text-cyan-500"
                  : "bg-muted border-border text-muted-foreground"
              )}
            >
              {active && <Check className="h-3 w-3" />}
              {genre}
            </button>
          )
        })}
      </div>
    </div>
  )
}
