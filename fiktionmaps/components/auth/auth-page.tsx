"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { useAuth } from "@/context/auth-context"
import { useRouter } from "@/i18n/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ArrowDown, ArrowLeft } from "lucide-react"
import { LocaleSwitcher } from "@/components/layout/locale-switcher"

type AuthView = "login" | "signup" | "forgot-password"

/** Inputs legibles sobre #111827 — evita bloques casi negros del token `bg-input`. */
const authFieldClass =
  "h-11 rounded-xl border border-white/[0.13] bg-[#283548] px-3.5 text-[15px] leading-none text-zinc-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] placeholder:text-zinc-500 transition-[border-color,box-shadow] focus-visible:border-sky-400/50 focus-visible:ring-2 focus-visible:ring-sky-400/25 focus-visible:ring-offset-0 md:text-[15px] disabled:opacity-55"

const authPrimaryButtonClass =
  "h-11 w-full rounded-xl bg-zinc-100 font-bold text-sm tracking-wide text-[#111827] shadow-md transition-colors hover:bg-white disabled:opacity-50"

const authSecondaryButtonClass =
  "h-11 w-full rounded-xl border border-white/15 bg-white/5 font-semibold text-zinc-100 shadow-sm backdrop-blur-sm transition-colors hover:bg-white/10"

/** Wordmark 2400×1081; `displayWidth` sets rendered width (aspect preserved). */
function FiktionLogo({
  displayWidth,
  alt,
}: {
  displayWidth: number
  alt: string
}) {
  return (
    <Image
      src="/fiktion-maps-logo.png"
      alt={alt}
      width={2400}
      height={1081}
      loading="eager"
      priority
      className="h-auto max-w-full drop-shadow-2xl"
      style={{ width: displayWidth, maxWidth: "100%" }}
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
        <label className="text-sm font-medium text-zinc-300">{label}</label>
        {rightSlot}
      </div>
      {children}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Auth Page                                                           */
/* ------------------------------------------------------------------ */
export function AuthPage() {
  const t = useTranslations("Auth")
  const tCommon = useTranslations("Common")
  const { login, signup, isLoading, user, needsOnboarding } = useAuth()
  const router = useRouter()
  const [view, setView] = useState<AuthView>("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  useEffect(() => {
    if (user && needsOnboarding) {
      router.replace("/onboarding")
    } else if (user) {
      router.replace("/map")
    }
  }, [user, needsOnboarding, router])

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
        if (!name.trim()) {
          setError(t("pleaseEnterFullName"))
          return
        }
        await signup(email, password, name)
      } else {
        await new Promise((r) => setTimeout(r, 900))
        setSuccess(t("resetLinkSent"))
        setTimeout(() => { setView("login"); resetForm() }, 2500)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : tCommon("error"))
    }
  }

  /* ---- layout ---- */
  return (
    <div className="dark relative flex min-h-screen w-full bg-[#111827]">
      {/* Left panel – logo + tagline (hidden on small screens) */}
      <div className="hidden md:flex flex-1 flex-col items-center justify-center gap-10 border-r border-white/10 px-6">
        <FiktionLogo displayWidth={520} alt={t("logoAlt")} />
        <div className="px-8 text-center">
          <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">
            {t("tagline")}
          </p>
        </div>
      </div>

      {/* Right panel – form, always centered */}
      <div className="flex w-full flex-col items-center justify-center px-6 py-16 md:w-[480px] md:flex-none">

        {/* Mobile logo (wordmark includes name + ™) */}
        <div className="mb-10 flex w-full justify-center px-2 md:hidden">
          <FiktionLogo displayWidth={320} alt={t("logoAlt")} />
        </div>

        {/* Forgot password view */}
        {view === "forgot-password" ? (
          <div className="w-full max-w-[360px]">
            <button
              onClick={() => { setView("login"); resetForm() }}
              className="mb-8 flex items-center gap-1.5 text-sm text-zinc-400 transition-colors hover:text-zinc-200"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("backToLogin")}
            </button>
            <h2 className="mb-1 text-xl font-bold text-zinc-100">{t("resetPassword")}</h2>
            <p className="mb-6 text-sm text-zinc-400">
              {t("resetPasswordDescription")}
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Field label={t("emailAddress")}>
                <Input
                  type="email"
                  placeholder={t("emailPlaceholder")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  required
                  className={authFieldClass}
                />
              </Field>
              {error && <p className="text-sm text-red-400">{error}</p>}
              {success && <p className="text-sm text-sky-300">{success}</p>}
              <Button
                type="submit"
                disabled={isLoading || !email}
                className={authSecondaryButtonClass}
              >
                {isLoading ? tCommon("sending") : t("sendResetLink")}
              </Button>
            </form>
            <LocaleSwitcher />
          </div>
        ) : (
          /* Login / Signup view */
          <div className="w-full max-w-[360px]">
            <form onSubmit={handleSubmit} className="space-y-4">
              {view === "signup" && (
                <Field label={t("fullName")}>
                  <Input
                    type="text"
                    placeholder={t("fullNamePlaceholder")}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isLoading}
                    required
                    className={authFieldClass}
                  />
                </Field>
              )}

              <Field label={t("emailAddress")}>
                <Input
                  type="email"
                  placeholder={t("emailPlaceholder")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  required
                  className={authFieldClass}
                />
              </Field>

              <Field
                label={t("password")}
                rightSlot={
                  view === "login" ? (
                    <button
                      type="button"
                      onClick={() => { setView("forgot-password"); resetForm() }}
                      className="text-xs font-semibold text-sky-400 transition-opacity hover:text-sky-300"
                    >
                      {t("forgotPassword")}
                    </button>
                  ) : undefined
                }
              >
                <Input
                  type="password"
                  placeholder={t("passwordPlaceholder")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  required
                  className={authFieldClass}
                />
              </Field>

              {error && <p className="text-sm text-red-400">{error}</p>}

              <Button
                type="submit"
                disabled={isLoading || !email || !password || (view === "signup" && !name)}
                className={authPrimaryButtonClass}
              >
                {isLoading ? t("loadingButton") : view === "login" ? t("login") : t("createAccount")}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-zinc-400">
              {view === "login" ? t("dontHaveAccount") : t("alreadyHaveAccount")}
              <button
                type="button"
                onClick={() => { setView(view === "login" ? "signup" : "login"); resetForm() }}
                className="font-semibold text-sky-400 transition-colors hover:text-sky-300"
              >
                {view === "login" ? t("createOne") : t("signIn")}
              </button>
            </p>

            <LocaleSwitcher />

            <div className="h-8" />
          </div>
        )}
      </div>

      <div className="absolute inset-x-0 bottom-6 flex justify-center">
        <Link
          href="/map"
          className="group flex h-8 w-24 items-center justify-center text-zinc-500 transition-colors hover:text-zinc-300 active:scale-95"
          aria-label={tCommon("browseMap")}
          title={tCommon("browseMap")}
        >
          <ArrowDown className="h-4 w-4 transition-transform duration-200 group-hover:translate-y-0.5" />
        </Link>
      </div>
    </div>
  )
}
