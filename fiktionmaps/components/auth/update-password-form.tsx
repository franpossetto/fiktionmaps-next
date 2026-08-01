"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "@/i18n/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { updatePasswordAction } from "@/lib/actions/auth/auth.actions"
import { validateNewPassword } from "@/lib/auth/password-rules"
import { isPasswordErrorCode } from "@/lib/auth/password-error-i18n"
import { accessTokenHasRecoveryAmr } from "@/lib/auth/recovery-session"
import { createClient } from "@/lib/supabase/client"

const authFieldClass =
  "h-11 rounded-xl border border-white/[0.13] bg-[#283548] px-3.5 text-[15px] leading-none text-zinc-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] placeholder:text-zinc-500 transition-[border-color,box-shadow] focus-visible:border-sky-400/50 focus-visible:ring-2 focus-visible:ring-sky-400/25 focus-visible:ring-offset-0 md:text-[15px] disabled:opacity-55"

const authPrimaryButtonClass =
  "h-11 w-full rounded-xl bg-zinc-100 font-bold text-sm tracking-wide text-[#111827] shadow-md transition-colors hover:bg-white disabled:opacity-50"

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label className="text-sm font-medium text-zinc-300">{label}</label>
      </div>
      {children}
    </div>
  )
}

type ClaimResult = { ok: true; email: string } | { ok: false }

async function sessionIsRecovery(): Promise<ClaimResult> {
  const supabase = createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.access_token || !accessTokenHasRecoveryAmr(session.access_token)) {
    return { ok: false }
  }
  return { ok: true, email: session.user.email ?? "" }
}

/**
 * Only accept a session created from this recovery link.
 * Never fall back to "whoever is already logged in" — that is a cross-account bug.
 */
async function claimRecoverySession(): Promise<ClaimResult> {
  const supabase = createClient()

  const hash = window.location.hash
  if (hash && hash.length > 1) {
    const params = new URLSearchParams(hash.slice(1))
    const type = params.get("type")
    const accessToken = params.get("access_token")
    const refreshToken = params.get("refresh_token")
    if (type === "recovery" && accessToken && refreshToken) {
      // Drop any prior login (e.g. another account in this browser) before claiming.
      await supabase.auth.signOut({ scope: "local" })
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      })
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${window.location.search}`,
      )
      if (!error) return sessionIsRecovery()
    }
  }

  const search = new URLSearchParams(window.location.search)
  const code = search.get("code")
  if (code) {
    await supabase.auth.signOut({ scope: "local" })
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    const url = new URL(window.location.href)
    url.searchParams.delete("code")
    window.history.replaceState(null, "", url.pathname + url.search)
    if (!error) return sessionIsRecovery()
  }

  // Already on a recovery session from /auth/callback (token_hash) in this tab.
  return sessionIsRecovery()
}

export function UpdatePasswordForm() {
  const t = useTranslations("Auth")
  const tCommon = useTranslations("Common")
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [sessionOk, setSessionOk] = useState(false)
  const [accountEmail, setAccountEmail] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    void claimRecoverySession().then((result) => {
      if (cancelled) return
      setSessionOk(result.ok)
      setAccountEmail(result.ok ? result.email : "")
      setReady(true)
      if (!result.ok) setError(t("passwordErrors.NOT_RECOVERY_SESSION"))
    })
    return () => {
      cancelled = true
    }
  }, [t])

  const mapError = (code: string) => {
    if (isPasswordErrorCode(code)) return t(`passwordErrors.${code}`)
    return tCommon("error")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    if (newPassword !== confirmPassword) {
      setError(mapError("MISMATCH"))
      return
    }

    const ruleError = validateNewPassword(newPassword)
    if (ruleError) {
      setError(mapError(ruleError))
      return
    }

    setIsLoading(true)
    try {
      const result = await updatePasswordAction(newPassword)
      if (!result.success) {
        setError(mapError(result.error))
        return
      }
      setSuccess(t("passwordUpdated"))
      setNewPassword("")
      setConfirmPassword("")
      setTimeout(() => {
        router.replace("/map")
      }, 1200)
    } catch {
      setError(tCommon("error"))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="dark relative flex min-h-screen w-full items-center justify-center bg-[#111827] px-6 py-16">
      <div className="w-full max-w-[360px]">
        <h2 className="mb-1 text-xl font-bold text-zinc-100">{t("setNewPassword")}</h2>
        <p className="mb-6 text-sm text-zinc-400">{t("setNewPasswordDescription")}</p>
        {accountEmail ? (
          <p className="mb-4 text-sm text-zinc-300">
            {t("resettingPasswordFor", { email: accountEmail })}
          </p>
        ) : null}
        <p className="mb-4 text-xs text-zinc-500">{t("passwordRulesHint")}</p>

        {!ready ? (
          <p className="text-sm text-zinc-400">{t("loadingButton")}</p>
        ) : !sessionOk ? (
          <div className="space-y-4">
            {error ? <p className="text-sm text-red-400">{error}</p> : null}
            <Button
              type="button"
              className={authPrimaryButtonClass}
              onClick={() => router.replace("/login")}
            >
              {t("backToLogin")}
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label={t("newPassword")}>
              <Input
                type="password"
                autoComplete="new-password"
                placeholder={t("passwordPlaceholder")}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={isLoading}
                required
                className={authFieldClass}
              />
            </Field>
            <Field label={t("confirmPassword")}>
              <Input
                type="password"
                autoComplete="new-password"
                placeholder={t("passwordPlaceholder")}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading}
                required
                className={authFieldClass}
              />
            </Field>
            {error ? <p className="text-sm text-red-400">{error}</p> : null}
            {success ? <p className="text-sm text-sky-300">{success}</p> : null}
            <Button
              type="submit"
              disabled={isLoading || !newPassword || !confirmPassword}
              className={authPrimaryButtonClass}
            >
              {isLoading ? t("loadingButton") : t("saveNewPassword")}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
