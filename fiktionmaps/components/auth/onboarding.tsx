"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { DEFAULT_FICTION_COVER } from "@/lib/constants/placeholders"
import { Check, ArrowRight, MapPin, Film, Star, Globe, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { City } from "@/lib/modules/cities"
import type { Fiction } from "@/lib/modules/fictions"
import { useApi } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { cn } from "@/lib/utils"
import onboardingData from "@/data/onboarding.json"

const GENRES = onboardingData.genres
const AVATARS = onboardingData.avatars

const STEPS = [
  { id: "welcome",  icon: Star,   title: "Welcome to FiktionMaps" },
  { id: "avatar",   icon: User,   title: "Choose your avatar" },
  { id: "genres",   icon: Film,   title: "What genres do you love?" },
  { id: "fictions", icon: Star,   title: "Pick your favorite fictions" },
  { id: "cities",   icon: MapPin, title: "Choose your cities" },
  { id: "done",     icon: Globe,  title: "You're all set" },
]

export function Onboarding() {
  const { user, completeOnboarding } = useAuth()
  const { cities: cityService, fictions: fictionService } = useApi()
  const [allCities, setAllCities] = useState<City[]>([])
  const [allFictions, setAllFictions] = useState<Fiction[]>([])
  const [step, setStep] = useState(0)
  const [selectedAvatar, setSelectedAvatar] = useState<string>(user?.avatar ?? "")
  const [selectedGenres, setSelectedGenres] = useState<string[]>([])
  const [selectedFictions, setSelectedFictions] = useState<string[]>([])
  const [selectedCities, setSelectedCities] = useState<string[]>([])

  useEffect(() => {
    cityService.getAll().then(setAllCities)
    fictionService.getAll().then(setAllFictions)
  }, [cityService, fictionService])

  const totalSteps = STEPS.length
  const progress = ((step) / (totalSteps - 1)) * 100

  const toggle = <T extends string>(arr: T[], val: T, set: (v: T[]) => void) => {
    set(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val])
  }

  const avatarSelected = AVATARS.some((avatar) => avatar.url === selectedAvatar)

  const canAdvance = () => {
    if (step === 1) return avatarSelected
    if (step === 2) return selectedGenres.length > 0
    if (step === 3) return selectedFictions.length > 0
    if (step === 4) return selectedCities.length > 0
    return true
  }

  const handleNext = () => {
    if (step < totalSteps - 1) {
      setStep((s) => s + 1)
    } else {
      completeOnboarding({
        genres: selectedGenres,
        fictions: selectedFictions,
        cities: selectedCities,
        ...(avatarSelected ? { avatar: selectedAvatar } : {}),
      })
    }
  }

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center px-4" style={{ background: "#0F1523" }}>
      {/* Logo */}
      <div className="mb-8 flex items-center gap-3">
        <Image
          src="/logo-icon.png"
          alt="FiktionMaps"
          width={40}
          height={40}
          loading="eager"
          className="h-10 w-auto"
        />
        <span className="text-xl font-black tracking-tight" style={{ color: "#e8e8e8" }}>
          fiktion<span style={{ color: "#00BFDF" }}>maps</span>
        </span>
      </div>

      {/* Progress bar */}
      {step > 0 && step < totalSteps - 1 && (
        <div className="mb-8 w-full max-w-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium" style={{ color: "#5a6080" }}>
              Step {step} of {totalSteps - 2}
            </span>
            <span className="text-xs font-medium" style={{ color: "#00BFDF" }}>
              {Math.round(((step - 1) / (totalSteps - 2)) * 100)}%
            </span>
          </div>
          <div className="h-1 w-full rounded-full" style={{ background: "#1a1f35" }}>
            <div
              className="h-1 rounded-full transition-all duration-500"
              style={{ width: `${((step - 1) / (totalSteps - 2)) * 100}%`, background: "#00BFDF" }}
            />
          </div>
        </div>
      )}

      {/* Card */}
      <div
        className="w-full max-w-lg rounded-2xl border p-8"
        style={{ background: "#111827", borderColor: "#1e2540" }}
      >
        {/* Step 0: Welcome */}
        {step === 0 && (
          <div className="flex flex-col items-center text-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl" style={{ background: "#1a1f35" }}>
              <Star className="h-8 w-8" style={{ color: "#F5C518" }} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">
                Welcome, {user?.name}!
              </h2>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: "#5a6080" }}>
                Let us personalize your experience. We will ask a few quick questions about your preferences so we can show you the most relevant filming locations.
              </p>
            </div>
            <div className="mt-2 flex gap-3 text-sm" style={{ color: "#5a6080" }}>
              {["Avatar", "Genres", "Fictions", "Cities"].map((label, i) => (
                <div key={label} className="flex items-center gap-1.5">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold"
                    style={{ background: "#1a1f35", color: "#00BFDF" }}>
                    {i + 1}
                  </div>
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 1: Avatar */}
        {step === 1 && (
          <div className="flex flex-col gap-5">
            <div>
              <h2 className="text-xl font-bold text-foreground">Choose your avatar</h2>
              <p className="mt-1 text-sm" style={{ color: "#5a6080" }}>Pick one to represent you.</p>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
              {AVATARS.map((avatar) => {
                const active = selectedAvatar === avatar.url
                return (
                  <button
                    key={avatar.id}
                    type="button"
                    onClick={() => setSelectedAvatar(avatar.url)}
                    aria-label={`Select avatar ${avatar.label}`}
                    className={cn(
                      "relative flex h-14 w-14 items-center justify-center rounded-xl border transition-all",
                      active ? "border-[#00BFDF] bg-[#00BFDF14]" : "border-[#1e2540] bg-[#1a1f35] hover:border-[#2b355a]"
                    )}
                  >
                    <Image
                      src={avatar.url}
                      alt={avatar.label}
                      width={48}
                      height={48}
                      className="h-10 w-10 rounded-full"
                      unoptimized
                    />
                    {active && (
                      <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full" style={{ background: "#00BFDF" }}>
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Step 2: Genres */}
        {step === 2 && (
          <div className="flex flex-col gap-5">
            <div>
              <h2 className="text-xl font-bold text-foreground">What genres do you love?</h2>
              <p className="mt-1 text-sm" style={{ color: "#5a6080" }}>Select all that apply.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {GENRES.map((genre) => {
                const active = selectedGenres.includes(genre)
                return (
                  <button
                    key={genre}
                    onClick={() => toggle(selectedGenres, genre, setSelectedGenres)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all",
                      active ? "text-white" : "text-[#8890b0]"
                    )}
                    style={{
                      background: active ? "#00BFDF22" : "#1a1f35",
                      border: `1.5px solid ${active ? "#00BFDF" : "#1e2540"}`,
                      color: active ? "#00BFDF" : "#8890b0",
                    }}
                  >
                    {active && <Check className="h-3 w-3" />}
                    {genre}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Step 3: Fictions */}
        {step === 3 && (
          <div className="flex flex-col gap-5">
            <div>
              <h2 className="text-xl font-bold text-foreground">Pick your favorite fictions</h2>
              <p className="mt-1 text-sm" style={{ color: "#5a6080" }}>Choose at least one.</p>
            </div>
            <div className="grid grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
              {allFictions.map((fiction) => {
                const active = selectedFictions.includes(fiction.id)
                return (
                  <button
                    key={fiction.id}
                    onClick={() => toggle(selectedFictions, fiction.id, setSelectedFictions)}
                    className="flex items-center gap-3 rounded-xl p-3 text-left transition-all"
                    style={{
                      background: active ? "#00BFDF12" : "#1a1f35",
                      border: `1.5px solid ${active ? "#00BFDF" : "#1e2540"}`,
                    }}
                  >
                    <div className="relative w-9 aspect-[2/3] flex-shrink-0 overflow-hidden rounded-lg">
                      <Image
                        src={fiction.coverImage?.trim() || DEFAULT_FICTION_COVER}
                        alt={fiction.title}
                        fill
                        className="object-cover"
                        sizes="36px"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={cn("truncate text-xs font-semibold", active ? "text-[#00BFDF]" : "text-foreground")}>
                        {fiction.title}
                      </p>
                      <p className="text-[10px]" style={{ color: "#5a6080" }}>{fiction.year}</p>
                    </div>
                    {active && (
                      <div className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full" style={{ background: "#00BFDF" }}>
                        <Check className="h-2.5 w-2.5 text-white" />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Step 4: Cities */}
        {step === 4 && (
          <div className="flex flex-col gap-5">
            <div>
              <h2 className="text-xl font-bold text-foreground">Choose your cities</h2>
              <p className="mt-1 text-sm" style={{ color: "#5a6080" }}>Which cities would you like to explore?</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {allCities.map((city) => {
                const active = selectedCities.includes(city.id)
                return (
                  <button
                    key={city.id}
                    onClick={() => toggle(selectedCities, city.id, setSelectedCities)}
                    className="flex items-center gap-3 rounded-xl p-4 text-left transition-all"
                    style={{
                      background: active ? "#00BFDF12" : "#1a1f35",
                      border: `1.5px solid ${active ? "#00BFDF" : "#1e2540"}`,
                    }}
                  >
                    <MapPin className="h-5 w-5 flex-shrink-0" style={{ color: active ? "#00BFDF" : "#5a6080" }} />
                    <div className="min-w-0">
                      <p className={cn("text-sm font-semibold", active ? "text-[#00BFDF]" : "text-foreground")}>
                        {city.name}
                      </p>
                      <p className="text-xs truncate" style={{ color: "#5a6080" }}>{city.country}</p>
                    </div>
                    {active && (
                      <div className="ml-auto flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full" style={{ background: "#00BFDF" }}>
                        <Check className="h-2.5 w-2.5 text-white" />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Step 5: Done */}
        {step === 5 && (
          <div className="flex flex-col items-center text-center gap-4">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-full"
              style={{ background: "#00BFDF1a", border: "2px solid #00BFDF" }}
            >
              <Check className="h-8 w-8" style={{ color: "#00BFDF" }} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">All set!</h2>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: "#5a6080" }}>
                Your preferences have been saved. The map will now highlight the locations most relevant to you.
              </p>
            </div>
            <div className="flex gap-6 text-sm mt-2">
              {[
                { label: "Genres", count: selectedGenres.length, color: "#F5C518" },
                { label: "Fictions", count: selectedFictions.length, color: "#E8365D" },
                { label: "Cities", count: selectedCities.length, color: "#00BFDF" },
              ].map(({ label, count, color }) => (
                <div key={label} className="flex flex-col items-center gap-1">
                  <span className="text-2xl font-black" style={{ color }}>{count}</span>
                  <span style={{ color: "#5a6080" }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Navigation buttons */}
      <div className="mt-6 flex w-full max-w-lg items-center justify-between">
        {step > 0 && step < totalSteps - 1 ? (
          <button
            onClick={() => setStep((s) => s - 1)}
            className="text-sm transition-opacity hover:opacity-70"
            style={{ color: "#5a6080" }}
          >
            Back
          </button>
        ) : (
          <div />
        )}

        <Button
          onClick={handleNext}
          disabled={!canAdvance()}
          className="flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold"
          style={{
            background: canAdvance() ? "#00BFDF" : "#1a1f35",
            color: canAdvance() ? "#0F1523" : "#5a6080",
            border: "none",
          }}
        >
          {step === 0 ? "Get started" : step === totalSteps - 1 ? "Start exploring" : "Continue"}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Skip link */}
      {step > 0 && step < totalSteps - 1 && (
        <button
          onClick={() =>
            completeOnboarding({
              genres: selectedGenres,
              fictions: selectedFictions,
              cities: selectedCities,
              ...(avatarSelected ? { avatar: selectedAvatar } : {}),
            })
          }
          className="mt-4 text-xs transition-opacity hover:opacity-70"
          style={{ color: "#3a4060" }}
        >
          Skip onboarding
        </button>
      )}
    </div>
  )
}
