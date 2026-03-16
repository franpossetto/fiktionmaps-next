"use client"

import { useEffect, useState } from "react"
import { useRouter } from "@/i18n/navigation"
import { useAuth } from "@/context/auth-context"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

export default function UsernamePage() {
  const router = useRouter()
  const { user } = useAuth()
  const [username, setUsername] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [available, setAvailable] = useState<boolean | null>(null)
  const [checking, setChecking] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [skipNextDebounce, setSkipNextDebounce] = useState(false)

  useEffect(() => {
    if (!user) {
      router.replace("/login")
    }
  }, [user, router])

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

      // First try the plain local-part as username
      const { data: isBaseAvailable, error: baseError } = await supabase.rpc("check_username_available", {
        p_username: base,
      })

      if (cancelled) return

      if (!baseError && isBaseAvailable === true) {
        setUsername(base)
        setAvailable(true)
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
      setAvailable(isSuffixAvailable === true)
      if (isSuffixAvailable === false) {
        setError("This username is already taken")
      }
      setSkipNextDebounce(true)
    }

    void suggestUsername()

    return () => {
      cancelled = true
    }
  }, [user, username])

  const validateUsername = (value: string) => {
    const trimmed = value.trim()
    if (trimmed.length < 3) return "Username must be at least 3 characters"
    if (!/^[a-zA-Z0-9.-]+$/.test(trimmed)) {
      return "Only letters, numbers, dots (.) and hyphens (-) are allowed"
    }
    return null
  }

  const checkAvailability = async (value: string) => {
    const trimmed = value.trim()
    if (validateUsername(trimmed)) {
      setAvailable(null)
      return
    }
    setChecking(true)
    setError(null)
    try {
      const supabase = createClient()
      const { data: isAvailable, error: rpcError } = await supabase.rpc("check_username_available", {
        p_username: trimmed,
      })
      if (rpcError) {
        setError("Could not check availability. You can still continue.")
        setAvailable(null)
        return
      }
      setAvailable(isAvailable === true)
      if (isAvailable === false) setError("This username is already taken")
    } finally {
      setChecking(false)
    }
  }

  // Debounced validation: check availability shortly after the user stops typing.
  useEffect(() => {
    if (skipNextDebounce) {
      setSkipNextDebounce(false)
      return
    }

    const trimmed = username.trim()
    if (!trimmed) {
      setAvailable(null)
      return
    }

    const handle = setTimeout(() => {
      void checkAvailability(trimmed)
    }, 500)

    return () => clearTimeout(handle)
  }, [username])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    const validationError = validateUsername(username)
    if (validationError) {
      setError(validationError)
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data: isAvailable, error: checkError } = await supabase.rpc("check_username_available", {
        p_username: username.trim(),
      })
      if (!checkError && isAvailable === false) {
        setError("This username is already taken")
        setAvailable(false)
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
          setError("This username is already taken")
        } else {
          setError("Could not save username. Please try again.")
        }
        return
      }

      router.replace("/onboarding")
    } finally {
      setSubmitting(false)
    }
  }

  if (!user) return null

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-foreground">Choose your username</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This will be your public name in FiktionMaps. You can change it later in your profile
          settings.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Username</label>
            <div className="relative">
              <Input
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value)
                  setError(null)
                  setAvailable(null)
                }}
                placeholder="your_username"
                className={cn(
                  "h-11 pr-28",
                  error
                    ? "border-destructive focus-visible:ring-destructive/30"
                    : available === true
                    ? "border-emerald-500 text-emerald-600 focus-visible:ring-emerald-500/30"
                    : ""
                )}
                autoFocus
              />
              {checking && (
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-medium text-muted-foreground">
                  Checking…
                </span>
              )}
              {!checking && available === true && !error && (
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-medium text-emerald-500">
                  Looks great
                </span>
              )}
            </div>
            <div className="mt-1 min-h-[1.5rem] text-xs space-y-0.5">
              <p className="text-muted-foreground">
                Letters, numbers, dots (.) and hyphens (-). Min 3 characters.
              </p>
              {error && <p className="text-destructive">{error}</p>}
            </div>
          </div>

          <Button
            type="submit"
            className={cn("h-11 w-full font-semibold")}
            disabled={submitting || !!validateUsername(username)}
          >
            {submitting ? "Saving…" : "Continue"}
          </Button>
        </form>
      </div>
    </div>
  )
}

