"use client"

import { useId, useState } from "react"
import Image from "next/image"
import { useAuth } from "@/context/auth-context"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ArrowDown, ArrowLeft, Compass } from "lucide-react"

type AuthView = "login" | "signup" | "forgot-password"

function BrandLogo({ size = 92 }: { size?: number }) {
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

function LabelRow({
  label,
  htmlFor,
  rightSlot,
}: {
  label: string
  htmlFor: string
  rightSlot?: React.ReactNode
}) {
  return (
    <div className="mb-1.5 flex items-center justify-between">
      <label htmlFor={htmlFor} className="text-sm font-medium text-[#dce8ff]">
        {label}
      </label>
      {rightSlot}
    </div>
  )
}

export function AuthPageGuidelines({ onBrowseMap }: { onBrowseMap?: () => void }) {
  const { login, signup, isLoading } = useAuth()
  const [view, setView] = useState<AuthView>("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const nameId = useId()
  const emailId = useId()
  const passwordId = useId()

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
        return
      }

      if (view === "signup") {
        if (!name.trim()) {
          setError("Please enter your name")
          return
        }
        await signup(email, password, name)
        return
      }

      await new Promise((resolve) => setTimeout(resolve, 900))
      setSuccess("Reset link sent. Check your inbox.")
      setTimeout(() => {
        setView("login")
        resetForm()
      }, 2400)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    }
  }

  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-[#0a1221] text-[#dce8ff]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,#1f3f72_0%,rgba(31,63,114,0.12)_42%,transparent_70%)]" />
      <div className="absolute -right-24 top-16 h-64 w-64 rounded-full bg-[#00BFDF1a] blur-3xl" />
      <div className="absolute left-8 top-24 h-56 w-56 rounded-full bg-[#E8365D1a] blur-3xl" />

      <div className="relative mx-auto grid min-h-screen w-full max-w-[1280px] grid-cols-1 md:grid-cols-[1fr_440px]">
        <section className="hidden border-r border-[#1a2944] px-10 py-12 md:flex md:flex-col md:justify-center">
          <div className="mx-auto flex max-w-md flex-col items-center text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#2a3f64] bg-[#121d32]/90 px-3 py-1 text-xs text-[#9cb2d8]">
              <Compass className="h-3.5 w-3.5 text-[#00BFDF]" />
              Story-driven location explorer
            </div>
            <div className="mt-8 flex flex-col items-center">
              <BrandLogo size={128} />
              <h1 className="mt-5 text-5xl font-black leading-[0.98] tracking-tight text-[#eef5ff]">
                fiktion maps
                <sup className="ml-1 align-super text-sm font-normal opacity-60">™</sup>
              </h1>
              <p className="mt-3 max-w-md text-sm text-[#9cb2d8]">
                Build routes through the scenes you love, city by city.
              </p>
            </div>
          </div>

        </section>

        <section className="flex items-center justify-center px-5 py-10 sm:px-8">
          <div className="w-full max-w-[360px]">
            <div className="mb-7 flex flex-col items-center gap-3 text-center md:hidden">
              <BrandLogo size={72} />
              <p className="text-2xl font-black text-[#eef5ff]">fiktion maps</p>
            </div>

            {view === "forgot-password" ? (
              <div>
                <button
                  type="button"
                  onClick={() => {
                    setView("login")
                    resetForm()
                  }}
                  className="mb-6 flex items-center gap-1.5 text-sm text-[#9cb2d8] transition-colors hover:text-[#dce8ff]"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to login
                </button>
                <h2 className="text-2xl font-bold text-[#eef5ff]">Reset password</h2>
                <p className="mt-1 text-sm text-[#9cb2d8]">Enter your email to receive a reset link.</p>

                <form onSubmit={handleSubmit} className="mt-5 space-y-4" noValidate>
                  <div>
                    <LabelRow label="Email address" htmlFor={emailId} />
                    <Input
                      id={emailId}
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading}
                      required
                      className="h-11 border-[#2a3f64] bg-[#111d32] text-[#eef5ff] placeholder:text-[#647aa3] focus-visible:ring-[#00BFDF]"
                    />
                  </div>

                  <div aria-live="polite" className="space-y-2">
                    {error && <p className="text-sm text-[#ff7e99]">{error}</p>}
                    {success && <p className="text-sm text-[#63d9ee]">{success}</p>}
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading || !email}
                    className="h-11 w-full border border-[#2a3f64] bg-[#0b1628] font-semibold text-[#eef5ff] hover:bg-[#11213a]"
                  >
                    {isLoading ? "Sending..." : "Send reset link"}
                  </Button>
                </form>
              </div>
            ) : (
              <div>
                <h2 className="text-2xl font-bold text-[#eef5ff]">
                  {view === "login" ? "Welcome back" : "Create account"}
                </h2>
                <p className="mt-1 text-sm text-[#9cb2d8]">
                  {view === "login"
                    ? "Sign in to continue your map journey."
                    : "Start collecting story-driven routes."}
                </p>

                <form onSubmit={handleSubmit} className="mt-5 space-y-4" noValidate>
                  {view === "signup" && (
                    <div>
                      <LabelRow label="Name" htmlFor={nameId} />
                      <Input
                        id={nameId}
                        type="text"
                        placeholder="Your name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        disabled={isLoading}
                        required
                        className="h-11 border-[#2a3f64] bg-[#111d32] text-[#eef5ff] placeholder:text-[#647aa3] focus-visible:ring-[#00BFDF]"
                      />
                    </div>
                  )}

                  <div>
                    <LabelRow label="Email address" htmlFor={emailId} />
                    <Input
                      id={emailId}
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading}
                      required
                      className="h-11 border-[#2a3f64] bg-[#111d32] text-[#eef5ff] placeholder:text-[#647aa3] focus-visible:ring-[#00BFDF]"
                    />
                  </div>

                  <div>
                    <LabelRow
                      label="Password"
                      htmlFor={passwordId}
                      rightSlot={
                        view === "login" ? (
                          <button
                            type="button"
                            onClick={() => {
                              setView("forgot-password")
                              resetForm()
                            }}
                            className="text-xs font-semibold text-[#63d9ee] transition-opacity hover:opacity-80"
                          >
                            Forgot password?
                          </button>
                        ) : undefined
                      }
                    />
                    <Input
                      id={passwordId}
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                      required
                      className="h-11 border-[#2a3f64] bg-[#111d32] text-[#eef5ff] placeholder:text-[#647aa3] focus-visible:ring-[#00BFDF]"
                    />
                  </div>

                  {error && (
                    <div aria-live="polite">
                      <p className="text-sm text-[#ff7e99]">{error}</p>
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={isLoading || !email || !password || (view === "signup" && !name)}
                    className="h-11 w-full bg-gradient-to-r from-[#00BFDF] to-[#3ad0e8] font-bold text-[#0b1424] hover:opacity-95"
                  >
                    {isLoading ? "Loading..." : view === "login" ? "Login" : "Create account"}
                  </Button>
                </form>

                <p className="mt-6 text-center text-sm text-[#8da2c7]">
                  {view === "login" ? "Don't have an account? " : "Already have an account? "}
                  <button
                    type="button"
                    onClick={() => {
                      setView(view === "login" ? "signup" : "login")
                      resetForm()
                    }}
                    className="font-semibold text-[#63d9ee] transition-opacity hover:opacity-80"
                  >
                    {view === "login" ? "Create one" : "Sign in"}
                  </button>
                </p>

                {onBrowseMap && <div className="h-8" />}
              </div>
            )}
          </div>
        </section>
      </div>

      {onBrowseMap && (
        <div className="absolute inset-x-0 bottom-6 flex justify-center">
          <button
            type="button"
            onClick={onBrowseMap}
            className="group flex h-9 w-28 items-center justify-center text-[#8da2c7] transition-transform duration-200 active:scale-95"
            aria-label="Browse map"
            title="Browse map"
          >
            <ArrowDown className="h-4 w-4 transition-transform duration-200 group-hover:translate-y-0.5" />
          </button>
        </div>
      )}
    </main>
  )
}
