"use client"

import { useState } from "react"
import Image from "next/image"
import { useAuth } from "@/lib/auth-context"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ArrowDown, ArrowLeft } from "lucide-react"

type AuthView = "login" | "signup" | "forgot-password"

function FiktionLogo({ size = 140 }: { size?: number }) {
  return (
    <Image
      src="/logo-icon.png"
      alt="FiktionMaps logo"
      width={size}
      height={size}
      loading="eager"
      style={{ width: "auto", height: size }}
      className="drop-shadow-2xl"
    />
  )
}

/* ------------------------------------------------------------------ */
/*  Shared input label pair                                            */
/* ------------------------------------------------------------------ */
function Field({
  label,
  rightSlot,
  children,
}: {
  label: string
  rightSlot?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">{label}</label>
        {rightSlot}
      </div>
      {children}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Auth Page                                                           */
/* ------------------------------------------------------------------ */
export function AuthPage({ onBrowseMap }: { onBrowseMap?: () => void }) {
  const { login, signup, isLoading } = useAuth()
  const [view, setView] = useState<AuthView>("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const resetForm = () => {
    setEmail("")
    setPassword("")
    setName("")
    setError("")
    setSuccess("")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    try {
      if (view === "login") {
        await login(email, password)
      } else if (view === "signup") {
        if (!name.trim()) { setError("Please enter your name"); return }
        await signup(email, password, name)
      } else {
        await new Promise((r) => setTimeout(r, 900))
        setSuccess("Reset link sent — check your inbox.")
        setTimeout(() => { setView("login"); resetForm() }, 2500)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    }
  }

  /* ---- layout ---- */
  return (
    <div className="relative flex min-h-screen w-full bg-background">
      {/* Left panel – logo + tagline (hidden on small screens) */}
      <div className="hidden md:flex flex-1 flex-col items-center justify-center gap-8 border-r border-border">
        <FiktionLogo size={160} />
        <div className="text-center px-8">
          <h1 className="text-6xl font-black tracking-tight leading-none text-foreground">
            fiktion maps
            <sup className="ml-1 align-super text-sm font-normal opacity-50">™</sup>
          </h1>
          <p className="mt-4 text-xs font-medium tracking-widest uppercase text-muted-foreground">
            Navigate stories by place, not just title
          </p>
        </div>
      </div>

      {/* Right panel – form, always centered */}
      <div className="flex w-full flex-col items-center justify-center px-6 py-16 md:w-[460px] md:flex-none">

        {/* Mobile logo */}
        <div className="mb-8 flex flex-col items-center gap-3 md:hidden">
          <FiktionLogo size={72} />
          <span className="text-2xl font-black text-foreground">
            fiktion maps<sup className="text-xs font-normal opacity-50">™</sup>
          </span>
        </div>

        {/* Forgot password view */}
        {view === "forgot-password" ? (
          <div className="w-full max-w-[360px]">
            <button
              onClick={() => { setView("login"); resetForm() }}
              className="mb-8 flex items-center gap-1.5 text-sm text-muted-foreground transition-opacity hover:opacity-70"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to login
            </button>
            <h2 className="mb-1 text-xl font-bold text-foreground">Reset password</h2>
            <p className="mb-6 text-sm text-muted-foreground">
              Enter your email and we will send you a reset link.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Field label="Email address">
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  required
                  className="h-11 border-input bg-input text-foreground placeholder:text-muted-foreground focus-visible:ring-ring"
                />
              </Field>
              {error && <p className="text-sm text-destructive">{error}</p>}
              {success && <p className="text-sm text-primary">{success}</p>}
              <Button
                type="submit"
                disabled={isLoading || !email}
                className="h-11 w-full font-semibold border border-border bg-secondary text-foreground hover:bg-secondary/80"
              >
                {isLoading ? "Sending…" : "Send reset link"}
              </Button>
            </form>
          </div>
        ) : (
          /* Login / Signup view */
          <div className="w-full max-w-[360px]">
            <form onSubmit={handleSubmit} className="space-y-4">
              {view === "signup" && (
                <Field label="Name">
                  <Input
                    type="text"
                    placeholder="Your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isLoading}
                    required
                    className="h-11 border-input bg-input text-foreground placeholder:text-muted-foreground focus-visible:ring-ring"
                  />
                </Field>
              )}

              <Field label="Email address">
                <Input
                  type="email"
                  placeholder=""
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  required
                  className="h-11 border-input bg-input text-foreground placeholder:text-muted-foreground focus-visible:ring-ring"
                />
              </Field>

              <Field
                label="Password"
                rightSlot={
                  view === "login" ? (
                    <button
                      type="button"
                      onClick={() => { setView("forgot-password"); resetForm() }}
                      className="text-xs font-semibold text-primary transition-opacity hover:opacity-80"
                    >
                      Forgot password?
                    </button>
                  ) : undefined
                }
              >
                <Input
                  type="password"
                  placeholder=""
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  required
                  className="h-11 border-input bg-input text-foreground placeholder:text-muted-foreground focus-visible:ring-ring"
                />
              </Field>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <Button
                type="submit"
                disabled={isLoading || !email || !password || (view === "signup" && !name)}
                className="h-11 w-full font-bold text-sm tracking-wide"
              >
                {isLoading ? "Loading…" : view === "login" ? "Login" : "Create account"}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              {view === "login" ? "Don't have an account? " : "Already have an account? "}
              <button
                type="button"
                onClick={() => { setView(view === "login" ? "signup" : "login"); resetForm() }}
                className="font-semibold text-primary transition-opacity hover:opacity-80"
              >
                {view === "login" ? "Create one" : "Sign in"}
              </button>
            </p>

            {onBrowseMap && <div className="h-8" />}
          </div>
        )}
      </div>

      {onBrowseMap && (
        <div className="absolute inset-x-0 bottom-6 flex justify-center">
          <button
            type="button"
            onClick={onBrowseMap}
            className="group flex h-8 w-24 items-center justify-center text-muted-foreground transition-transform duration-200 active:scale-95"
            aria-label="Browse map"
            title="Browse map"
          >
            <ArrowDown className="h-4 w-4 transition-transform duration-200 group-hover:translate-y-0.5" />
          </button>
        </div>
      )}
    </div>
  )
}
