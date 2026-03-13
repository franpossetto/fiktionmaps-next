"use client"

import { useEffect, useState, useRef } from "react"
import Image from "next/image"
import { AnimatePresence, motion } from "framer-motion"
import { DEFAULT_FICTION_COVER } from "@/lib/constants/placeholders"
import { Check, ArrowRight, MapPin, Film, Star, Globe, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { City } from "@/lib/modules/cities"
import type { Fiction } from "@/lib/modules/fictions"
import { useApi } from "@/lib/api"
import { useAuth } from "@/context/auth-context"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { getCurrentUserProfileAction } from "@/lib/auth/profile.actions"
import onboardingData from "@/data/onboarding.json"

const DEFAULT_AVATAR = "/logo-icon.png"

/** Primer paso pendiente según lo que ya tiene el perfil (retomar, no re-pedir lo ya ok). */
function firstPendingStep(profile: { username?: string; avatar?: string } | null): number {
  if (!profile) return 0
  const hasUsername = (profile.username?.trim().length ?? 0) >= 3
  const hasAvatar = !!(profile.avatar && profile.avatar !== DEFAULT_AVATAR)
  if (!hasUsername) return 0
  if (!hasAvatar) return 1
  return 2 // géneros, ficciones, ciudades
}

const GENRES = onboardingData.genres
const AVATARS = (onboardingData.avatars as { id: string; label: string; url: string }[]).slice(0, 8)

const MAX_SELECTION = 10

const STEPS = [
  { id: "welcome", icon: Star, title: "Welcome to FiktionMaps" },
  { id: "avatar", icon: User, title: "Choose your avatar" },
  { id: "genres", icon: Film, title: "What genres do you love?" },
  { id: "fictions", icon: Star, title: "Pick your favorite fictions" },
  { id: "cities", icon: MapPin, title: "Choose your cities" },
  { id: "done", icon: Globe, title: "You're all set" },
]

const stepVariants = {
  initial: { opacity: 0, x: 40, filter: "blur(6px)" },
  animate: { opacity: 1, x: 0, filter: "blur(0px)" },
  exit: { opacity: 0, x: -40, filter: "blur(6px)" },
}

interface OnboardingProps {
  /** Si viene desde el profile queremos empezar siempre en el paso de username. */
  forceStartAtZero?: boolean
}

export function Onboarding({ forceStartAtZero = false }: OnboardingProps) {
  const { user, completeOnboarding } = useAuth()
  const { cities: cityService, fictions: fictionService } = useApi()
  const [allCities, setAllCities] = useState<City[]>([])
  const [allFictions, setAllFictions] = useState<Fiction[]>([])
  const [step, setStep] = useState<number | null>(forceStartAtZero ? 0 : null)
  // Start empty so that the suggestion effect can propose a checked username.
  const [username, setUsername] = useState<string>("")
  const [usernameError, setUsernameError] = useState<string | null>(null)
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null)
  const [usernameChecking, setUsernameChecking] = useState(false)
  const [usernameSaving, setUsernameSaving] = useState(false)
  const [skipNextDebounce, setSkipNextDebounce] = useState(false)
  const [selectedAvatar, setSelectedAvatar] = useState<string>(user?.avatar ?? "")
  const [selectedGenres, setSelectedGenres] = useState<string[]>([])
  const [selectedFictions, setSelectedFictions] = useState<string[]>([])
  const [selectedCities, setSelectedCities] = useState<string[]>([])
  const [completeError, setCompleteError] = useState<string | null>(null)
  const [completing, setCompleting] = useState(false)
  const resumeApplied = useRef(false)

  useEffect(() => {
    cityService.getAll().then(setAllCities)
    fictionService.getAll().then(setAllFictions)
  }, [cityService, fictionService])

  // Debounced validation: check availability shortly after the user stops typing.
  useEffect(() => {
    if (skipNextDebounce) {
      setSkipNextDebounce(false)
      return
    }

    const trimmed = username.trim()
    if (!trimmed) {
      setUsernameAvailable(null)
      return
    }

    const handle = setTimeout(() => {
      void checkUsernameAvailability(trimmed)
    }, 500)

    return () => clearTimeout(handle)
  }, [username, skipNextDebounce])

  // Suggest an initial username from the email and ensure it's available.
  useEffect(() => {
    if (!user || username.trim().length > 0) return

    const emailLocalPart = user.email?.split("@")[0]?.trim() ?? ""
    if (!emailLocalPart) return

    let cancelled = false

    const suggestUsername = async () => {
      const supabase = createClient()
      // Restrict to allowed characters for usernames
      const base = emailLocalPart.replace(/[^a-zA-Z0-9.-]/g, "")
      if (!base) return

      // First try the plain local-part as username
      const { data: isBaseAvailable, error: baseError } = await supabase.rpc("check_username_available", {
        p_username: base,
      })

      if (cancelled) return

      if (!baseError && isBaseAvailable === true) {
        setUsername(base)
        setUsernameAvailable(true)
        setSkipNextDebounce(true)
        return
      }

      // If not available, try with a random 3‑digit suffix
      const randomSuffix = Math.floor(100 + Math.random() * 900)
      const withSuffix = `${base}-${randomSuffix}`
      const { data: isSuffixAvailable } = await supabase.rpc("check_username_available", {
        p_username: withSuffix,
      })

      if (cancelled) return

      setUsername(withSuffix)
      setUsernameAvailable(isSuffixAvailable === true)
      if (isSuffixAvailable === false) {
        setUsernameError("That username is already taken. Try another one.")
      }
      setSkipNextDebounce(true)
    }

    void suggestUsername()

    return () => {
      cancelled = true
    }
  }, [user, username])

  // Retomar: empezar en el primer paso pendiente y prellenar lo que ya está ok.
  // Si venimos desde el profile (forceStartAtZero), siempre arrancamos en el paso 0
  // pero igual prellenamos username/avatar desde el perfil.
  useEffect(() => {
    if (!user?.id || resumeApplied.current) return
    getCurrentUserProfileAction().then((result) => {
      resumeApplied.current = true
      const profile = result.data ?? null
      const startStep = forceStartAtZero ? 0 : firstPendingStep(profile)
      setStep(startStep)
      if (profile?.username?.trim()) setUsername(profile.username.trim())
      if (profile?.avatar && profile.avatar !== DEFAULT_AVATAR) setSelectedAvatar(profile.avatar)
    })
  }, [user?.id, forceStartAtZero])

  // Si no venimos desde el profile y aún no sabemos el paso inicial, mostramos un pequeño loading.
  if (!forceStartAtZero && step === null) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background text-foreground">
        <p className="text-sm text-muted-foreground">Loading your onboarding…</p>
      </div>
    )
  }

  const totalSteps = STEPS.length

  const toggle = <T extends string>(arr: T[], val: T, set: (v: T[]) => void) => {
    set(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val])
  }

  const toggleWithMax = <T extends string>(arr: T[], val: T, set: (v: T[]) => void, max: number) => {
    if (arr.includes(val)) {
      set(arr.filter((x) => x !== val))
    } else if (arr.length < max) {
      set([...arr, val])
    }
  }

  const avatarSelected = AVATARS.some((avatar) => avatar.url === selectedAvatar)

  function validateUsername(value: string) {
    const trimmed = value.trim()
    if (trimmed.length < 3) return "Username must be at least 3 characters"
    if (!/^[a-zA-Z0-9.-]+$/.test(trimmed)) {
      return "Only letters, numbers, dots (.) and hyphens (-) are allowed"
    }
    return null
  }

  async function checkUsernameAvailability(value: string) {
    const trimmed = value.trim()
    if (validateUsername(trimmed)) {
      setUsernameAvailable(null)
      return
    }
    setUsernameChecking(true)
    setUsernameError(null)
    try {
      const supabase = createClient()
      const { data: available, error } = await supabase.rpc("check_username_available", {
        p_username: trimmed,
      })
      if (error) {
        setUsernameError("Could not check availability. You can still continue.")
        setUsernameAvailable(null)
        return
      }
      setUsernameAvailable(available === true)
      if (available === false) {
        setUsernameError("That username is already taken. Try another one.")
      }
    } finally {
      setUsernameChecking(false)
    }
  }

  const canAdvance = () => {
    if (step === 0) {
      return !validateUsername(username) && usernameAvailable !== false && !usernameSaving
    }
    // Steps 1–4: user can continue without selecting (all optional)
    return true
  }

  const hasSelectionInStep =
    step === 0 ? canAdvance()
    : step === 1 ? avatarSelected
    : step === 2 ? selectedGenres.length > 0
    : step === 3 ? selectedFictions.length > 0
    : step === 4 ? selectedCities.length > 0
    : true
  const buttonVariant = hasSelectionInStep ? "default" : "outline"

  const handleNext = async () => {
    if (step === 0) {
      if (!user) return
      const validationError = validateUsername(username)
      if (validationError) {
        setUsernameError(validationError)
        return
      }

      setUsernameSaving(true)
      setUsernameError(null)
      try {
        const supabase = createClient()
        const { data: available, error: checkError } = await supabase.rpc("check_username_available", {
          p_username: username.trim(),
        })
        if (!checkError && available === false) {
          setUsernameError("That username is already taken. Try another one.")
          setUsernameAvailable(false)
          return
        }

        const { error: updateError } = await supabase
          .from("profiles")
          .update({
            username: username.trim(),
            full_name: user.name?.trim() || null,
          })
          .eq("id", user.id)

        if (updateError) {
          if (updateError.code === "23505") {
            setUsernameError("That username is already taken. Try another one.")
          } else {
            setUsernameError("Could not save your username. Please try again.")
          }
          return
        }

        setStep(1)
        return
      } finally {
        setUsernameSaving(false)
      }
    }

    if (step < totalSteps - 1) {
      setStep((s) => s + 1)
    } else {
      setCompleting(true)
      setCompleteError(null)
      try {
        await completeOnboarding({
          genres: selectedGenres,
          fictions: selectedFictions,
          cities: selectedCities,
          ...(avatarSelected ? { avatar: selectedAvatar } : {}),
        })
        if (typeof window !== "undefined") {
          localStorage.setItem("fiktionmaps_onboarding_genres", JSON.stringify(selectedGenres))
        }
      } catch (e) {
        setCompleteError(e instanceof Error ? e.message : "Could not save. Try again.")
      } finally {
        setCompleting(false)
      }
    }
  }

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center px-4 py-6 bg-background text-foreground">
      <AnimatePresence mode="wait" initial={false}>
        {/* Step 0: Username — epic welcome, then input (no card) */}
        {step === 0 && (
          <motion.div
            key="onboarding-step-0"
            variants={stepVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="flex w-full max-w-lg flex-col items-center"
          >
          <div className="mb-12 w-full text-center">
            <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl md:text-6xl">
              Hola, hermosura!
            </h1>
            <p className="mt-4 text-lg text-muted-foreground sm:text-xl">
              The map is waiting. Pick the name you’ll leave on it.
            </p>
          </div>
          <div className="w-full space-y-2">
            <label className="sr-only" htmlFor="onboarding-username">
              Username
            </label>
            <div className="relative">
              <input
                id="onboarding-username"
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value)
                  setUsernameError(null)
                  setUsernameAvailable(null)
                }}
                placeholder="your_username"
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
                  Checking…
                </span>
              )}
              {!usernameChecking && usernameAvailable === true && !usernameError && (
                <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-xs font-medium text-emerald-500">
                  Looks great
                </span>
              )}
            </div>
            <p className="text-center text-xs text-muted-foreground">
              Letters, numbers, dots (.) and hyphens (-). Min 3 characters.
            </p>
            {usernameError && (
              <p className="text-center text-sm text-destructive">{usernameError}</p>
            )}
          </div>
        </motion.div>
        )}

        {/* Steps 1–5: same design as step 0 — big headline, subtitle, content (no card) */}
        {step !== 0 && (
        <motion.div
          key={`onboarding-step-${step}`}
          variants={stepVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.35, ease: "easeOut" }}
          className={cn(
            "flex w-full flex-col items-center",
            step === 1 || step === 3 ? "max-w-4xl" : "max-w-lg"
          )}
        >

        {/* Step 1: Avatar — Netflix-style: 2 rows of 4, scroll on small screens */}
        {step === 1 && (
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
              {AVATARS.map((avatar) => {
                const active = selectedAvatar === avatar.url
                return (
                  <button
                    key={avatar.id}
                    type="button"
                    onClick={() => setSelectedAvatar(avatar.url)}
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
        )}

        {/* Step 2: Genres */}
        {step === 2 && (
          <div className="flex w-full flex-col items-center">
            <div className="mb-12 w-full text-center">
              <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl md:text-6xl">
                What genres do you love?
              </h1>
              <p className="mt-4 text-lg text-muted-foreground sm:text-xl">
                Select all that apply.
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {selectedGenres.length === 0
                  ? "No has seleccionado nada"
                  : `Has seleccionado ${selectedGenres.length}`}
                {" · "}
                <span className="font-medium text-foreground">{selectedGenres.length}/{MAX_SELECTION}</span>
              </p>
            </div>
            <div className="w-full flex flex-wrap gap-2 justify-center">
              {GENRES.map((genre) => {
                const active = selectedGenres.includes(genre)
                return (
                  <button
                    key={genre}
                    onClick={() => toggleWithMax(selectedGenres, genre, setSelectedGenres, MAX_SELECTION)}
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
        )}

        {/* Step 3: Fictions */}
        {step === 3 && (
          <div className="flex w-full flex-col items-center">
            <div className="mb-12 w-full text-center">
              <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl md:text-6xl">
                Tell us the fictions you love
              </h1>
              <p className="mt-4 text-lg text-muted-foreground sm:text-xl max-w-xl mx-auto">
                Some worlds feel like home — choose yours.
              </p>
            </div>
            <div className="w-full grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 max-h-[65vh] min-h-[240px] overflow-y-auto overflow-x-hidden pr-1 pb-2 overscroll-contain">
              {allFictions.map((fiction) => {
                const active = selectedFictions.includes(fiction.id)
                return (
                  <button
                    key={fiction.id}
                    onClick={() => toggleWithMax(selectedFictions, fiction.id, setSelectedFictions, MAX_SELECTION)}
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
                        {fiction.year != null && fiction.year !== "" && (
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
        )}

        {/* Step 4: Cities — tag-style selection similar to genres */}
        {step === 4 && (
          <div className="flex w-full flex-col items-center">
            <div className="mb-12 w-full text-center">
              <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl md:text-6xl">
                Choose your cities
              </h1>
              <p className="mt-4 text-lg text-muted-foreground sm:text-xl">
                Which cities would you like to explore?
              </p>
            </div>
            <div className="w-full flex flex-wrap gap-2 justify-center">
              {allCities.map((city) => {
                const active = selectedCities.includes(city.id)
                return (
                  <button
                    key={city.id}
                    onClick={() => toggleWithMax(selectedCities, city.id, setSelectedCities, MAX_SELECTION)}
                    className={cn(
                      "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all border",
                      active
                        ? "bg-cyan-500/10 border-cyan-500 text-cyan-500"
                        : "bg-muted border-border text-muted-foreground"
                    )}
                    title={`${city.name}${city.country ? `, ${city.country}` : ""}`}
                  >
                    <MapPin className={cn("h-4 w-4", active ? "text-cyan-500" : "text-muted-foreground")} />
                    <span className="truncate max-w-[10rem]">
                      {city.name}
                      {city.country ? `, ${city.country}` : ""}
                    </span>
                    {active && <Check className="h-3 w-3" />}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Step 5: Done */}
        {step === 5 && (
          <div className="flex w-full flex-col items-center text-center">
            <div className="mb-12 w-full text-center">
              <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl md:text-6xl">
                You&apos;re all set!
              </h1>
              <p className="mt-4 text-lg text-muted-foreground sm:text-xl">
                Your preferences have been saved. The map will now highlight the locations most relevant to you.
              </p>
            </div>
          </div>
        )}
        </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation buttons */}
      <div
        className={cn(
          "mt-6 flex w-full items-center justify-between",
          step === 1 || step === 3 ? "max-w-4xl" : "max-w-lg"
        )}
      >
        {step > 0 && step < totalSteps - 1 ? (
          <button
            onClick={() => setStep((s) => s - 1)}
            className="text-sm text-muted-foreground transition-opacity hover:opacity-70"
          >
            Back
          </button>
        ) : (
          <div />
        )}

        <div className="flex items-center gap-3">
          {(step === 2 || step === 3 || step === 4) && (
            <div className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">
                {step === 2 && `${selectedGenres.length}/${MAX_SELECTION}`}
                {step === 3 && `${selectedFictions.length}/${MAX_SELECTION}`}
                {step === 4 && `${selectedCities.length}/${MAX_SELECTION}`}
              </span>
            </div>
          )}

          <Button
            onClick={handleNext}
            disabled={!canAdvance() || completing}
            className={cn(
              "flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold",
              hasSelectionInStep
                ? "bg-black text-white hover:bg-black/90 hover:text-white"
                : "border border-border bg-background text-foreground hover:bg-muted"
            )}
            variant="outline"
          >
            {step === 0
              ? "Get started"
              : step === totalSteps - 1
                ? completing
                  ? "Saving…"
                  : "Start exploring"
                : "Continue"}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {completeError && (
        <p className="mt-2 text-center text-sm text-destructive">{completeError}</p>
      )}
    </div>
  )
}
