"use client"

import { useEffect, useState, useRef } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowRight, MapPin, Film, Star, Globe, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { City } from "@/lib/modules/cities"
import type { Fiction } from "@/lib/modules/fictions"
import { useApi } from "@/lib/api"
import { useAuth } from "@/context/auth-context"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { getCurrentUserProfileAction } from "@/lib/auth/profile.actions"
import onboardingData from "@/data/onboarding.json"
import {
  OnboardingStepWelcome,
  OnboardingStepAvatar,
  OnboardingStepAbout,
  OnboardingStepGenres,
  OnboardingStepFictions,
  OnboardingStepCities,
  OnboardingStepDone,
} from "@/components/auth/onboarding/index"

const DEFAULT_AVATAR = "/logo-icon.png"

/** First pending step based on what the profile already has (resume, don't re-ask what's already ok). */
function firstPendingStep(profile: { username?: string; avatar?: string } | null): number {
  if (!profile) return 0
  const hasUsername = (profile.username?.trim().length ?? 0) >= 3
  const hasAvatar = !!(profile.avatar && profile.avatar !== DEFAULT_AVATAR)
  if (!hasUsername) return 0
  if (!hasAvatar) return 1
  return 2 // genres, fictions, cities
}

const GENRES = onboardingData.genres
const AVATARS = (onboardingData.avatars as { id: string; label: string; url: string }[]).slice(0, 8)

const MAX_SELECTION = 10

const STEPS = [
  { id: "welcome", icon: Star, title: "Welcome to FiktionMaps" },
  { id: "avatar", icon: User, title: "Choose your avatar" },
  { id: "about", icon: User, title: "Tell us about you" },
  { id: "genres", icon: Film, title: "Tell us what you love?" },
  { id: "fictions", icon: Star, title: "What worlds do you want to explore?" },
  { id: "cities", icon: MapPin, title: "What places fascinate you?" },
  { id: "done", icon: Globe, title: "You're all set" },
]

const stepVariants = {
  initial: { opacity: 0, x: 40, filter: "blur(6px)" },
  animate: { opacity: 1, x: 0, filter: "blur(0px)" },
  exit: { opacity: 0, x: -40, filter: "blur(6px)" },
}

interface OnboardingProps {
  /** When coming from profile we want to always start at the username step. */
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
  const [aboutBio, setAboutBio] = useState("")
  const [aboutGender, setAboutGender] = useState("")
  const [aboutPhone, setAboutPhone] = useState("")
  const [aboutDateOfBirth, setAboutDateOfBirth] = useState("")
  const [selectedGenres, setSelectedGenres] = useState<string[]>([])
  const [selectedFictions, setSelectedFictions] = useState<string[]>([])
  const [selectedCities, setSelectedCities] = useState<string[]>([])
  const [completeError, setCompleteError] = useState<string | null>(null)
  const [completing, setCompleting] = useState(false)
  const [aboutSaving, setAboutSaving] = useState(false)
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

  // Resume: start at the first pending step and prefill what's already ok.
  // When coming from profile (forceStartAtZero), we always start at step 0
  // but still prefill username/avatar from the profile.
  useEffect(() => {
    if (!user?.id || resumeApplied.current) return
    getCurrentUserProfileAction().then((result) => {
      resumeApplied.current = true
      const profile = result.data ?? null
      const startStep = forceStartAtZero ? 0 : firstPendingStep(profile)
      setStep(startStep)
      if (profile?.username?.trim()) setUsername(profile.username.trim())
      if (profile?.avatar && profile.avatar !== DEFAULT_AVATAR) setSelectedAvatar(profile.avatar)
      if (profile?.bio) setAboutBio(profile.bio)
      if (profile?.gender) setAboutGender(profile.gender)
      if (profile?.phone) setAboutPhone(profile.phone)
      if (profile?.dateOfBirth) setAboutDateOfBirth(profile.dateOfBirth)
    })
  }, [user?.id, forceStartAtZero])

  // When not coming from profile and we don't know the initial step yet, show a short loading.
  if (!forceStartAtZero && step === null) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background text-foreground">
        <p className="text-sm text-muted-foreground">Loading your onboarding…</p>
      </div>
    )
  }

  const totalSteps = STEPS.length

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
    : step === 2 ? true // about: optional, can always continue
    : step === 3 ? selectedGenres.length > 0
    : step === 4 ? selectedFictions.length > 0
    : step === 5 ? selectedCities.length > 0
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

    if (step === 2 && user) {
      setAboutSaving(true)
      try {
        const supabase = createClient()
        await supabase
          .from("profiles")
          .update({
            bio: aboutBio.trim() || null,
            gender: aboutGender.trim() || null,
            phone: aboutPhone.trim() || null,
            date_of_birth: aboutDateOfBirth.trim() || null,
          })
          .eq("id", user.id)
        setStep(3)
      } finally {
        setAboutSaving(false)
      }
      return
    }

    if (step != null && step < totalSteps - 1) {
      setStep((s) => (s ?? 0) + 1)
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
            <OnboardingStepWelcome
              username={username}
              usernameError={usernameError}
              usernameAvailable={usernameAvailable}
              usernameChecking={usernameChecking}
              onUsernameChange={(value: string) => {
                setUsername(value)
                setUsernameError(null)
                setUsernameAvailable(null)
              }}
            />

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
            step === 1 || step === 4 ? "max-w-4xl" : "max-w-lg"
          )}
        >

        {step === 1 && (
          <OnboardingStepAvatar
            avatars={AVATARS}
            selectedAvatar={selectedAvatar}
            onSelectAvatar={setSelectedAvatar}
          />
        )}

        {step === 2 && (
          <OnboardingStepAbout
            bio={aboutBio}
            gender={aboutGender}
            phone={aboutPhone}
            dateOfBirth={aboutDateOfBirth}
            onBioChange={setAboutBio}
            onGenderChange={setAboutGender}
            onPhoneChange={setAboutPhone}
            onDateOfBirthChange={setAboutDateOfBirth}
          />
        )}

        {step === 3 && (
          <OnboardingStepGenres
            genres={GENRES}
            selectedGenres={selectedGenres}
            maxSelection={MAX_SELECTION}
            onToggleGenre={(genre: string) => toggleWithMax(selectedGenres, genre, setSelectedGenres, MAX_SELECTION)}
          />
        )}

        {step === 4 && (
          <OnboardingStepFictions
            fictions={allFictions}
            selectedFictions={selectedFictions}
            maxSelection={MAX_SELECTION}
            onToggleFiction={(id: string) => toggleWithMax(selectedFictions, id, setSelectedFictions, MAX_SELECTION)}
          />
        )}

        {step === 5 && (
          <OnboardingStepCities
            cities={allCities}
            selectedCities={selectedCities}
            maxSelection={MAX_SELECTION}
            onToggleCity={(id: string) => toggleWithMax(selectedCities, id, setSelectedCities, MAX_SELECTION)}
          />
        )}

        {step === 6 && <OnboardingStepDone />}
        </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation buttons */}
      <div
        className={cn(
          "mt-6 flex w-full items-center justify-between",
          step != null && (step === 1 || step === 4) ? "max-w-4xl" : "max-w-lg"
        )}
      >
        {step != null && step > 0 && step < totalSteps - 1 ? (
          <button
            onClick={() => setStep((s) => (s ?? 0) - 1)}
            className="text-sm text-muted-foreground transition-opacity hover:opacity-70"
          >
            Back
          </button>
        ) : (
          <div />
        )}

        <div className="flex items-center gap-3">
          {step != null && (step === 3 || step === 4 || step === 5) && (
            <div className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">
                {step === 3 && `${selectedGenres.length}/${MAX_SELECTION}`}
                {step === 4 && `${selectedFictions.length}/${MAX_SELECTION}`}
                {step === 5 && `${selectedCities.length}/${MAX_SELECTION}`}
              </span>
            </div>
          )}

          <Button
            onClick={handleNext}
            disabled={!canAdvance() || completing || aboutSaving}
            className={cn(
              "flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold",
              step === 0 && hasSelectionInStep
                ? ""
                : hasSelectionInStep
                  ? "bg-muted text-foreground border border-border hover:bg-muted/80"
                  : "border border-border bg-background text-foreground hover:bg-muted"
            )}
            variant={step === 0 && hasSelectionInStep ? "default" : "outline"}
          >
            {step === 0
              ? "Next"
              : step === totalSteps - 1
                ? completing
                  ? "Saving…"
                  : "Start exploring"
                : step === 2 && aboutSaving
                  ? "Saving…"
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
