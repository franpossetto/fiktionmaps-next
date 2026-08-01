"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { changePasswordAction } from "@/lib/actions/auth/auth.actions"
import { validateNewPassword } from "@/lib/auth/password-rules"
import { isPasswordErrorCode } from "@/lib/auth/password-error-i18n"

export function ChangePasswordForm() {
  const t = useTranslations("Settings.account")
  const tAuth = useTranslations("Auth")
  const tCommon = useTranslations("Common")
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const mapError = (code: string) => {
    if (isPasswordErrorCode(code)) return tAuth(`passwordErrors.${code}`)
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

    if (currentPassword === newPassword) {
      setError(mapError("SAME_PASSWORD"))
      return
    }

    setIsLoading(true)
    try {
      const result = await changePasswordAction(currentPassword, newPassword)
      if (!result.success) {
        setError(mapError(result.error))
        return
      }
      setSuccess(t("passwordChanged"))
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch {
      setError(tCommon("error"))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md space-y-4">
      <p className="text-sm text-muted-foreground">{tAuth("passwordRulesHint")}</p>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground" htmlFor="current-password">
          {t("currentPassword")}
        </label>
        <Input
          id="current-password"
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          disabled={isLoading}
          required
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground" htmlFor="new-password">
          {t("newPassword")}
        </label>
        <Input
          id="new-password"
          type="password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          disabled={isLoading}
          required
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground" htmlFor="confirm-password">
          {t("confirmPassword")}
        </label>
        <Input
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          disabled={isLoading}
          required
        />
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {success ? <p className="text-sm text-emerald-600 dark:text-emerald-400">{success}</p> : null}

      <Button
        type="submit"
        disabled={isLoading || !currentPassword || !newPassword || !confirmPassword}
      >
        {isLoading ? tCommon("loading") : t("changePassword")}
      </Button>
    </form>
  )
}
