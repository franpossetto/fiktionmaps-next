"use client"

import { useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  changePasswordAction,
  requestPasswordResetAction,
} from "@/lib/actions/auth/auth.actions"
import { validateNewPassword } from "@/lib/auth/password-rules"
import { isPasswordErrorCode } from "@/lib/auth/password-error-i18n"
import {
  FORM_CARD_ACTION_CLASS,
  FORM_CARD_BODY_CLASS,
  FORM_CARD_CLASS,
  FORM_CARD_FOOTER_CLASS,
  FORM_FIELD_GRID_CLASS,
} from "@/components/ui/form-card"

type ChangePasswordFormProps = {
  /** Session email, used for the "send reset link" fallback. */
  email?: string | null
}

export function ChangePasswordForm({ email: sessionEmail }: ChangePasswordFormProps) {
  const t = useTranslations("Settings.account")
  const tAuth = useTranslations("Auth")
  const tCommon = useTranslations("Common")
  const locale = useLocale()
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [linkError, setLinkError] = useState("")
  const [linkSuccess, setLinkSuccess] = useState("")
  const [isSendingLink, setIsSendingLink] = useState(false)

  const email = sessionEmail?.trim() ?? ""

  const mapError = (code: string) => {
    if (isPasswordErrorCode(code)) return tAuth(`passwordErrors.${code}`)
    return tCommon("error")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    setLinkError("")
    setLinkSuccess("")

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

  const handleSendResetLink = async () => {
    if (!email) return
    setLinkError("")
    setLinkSuccess("")
    setError("")
    setSuccess("")
    setIsSendingLink(true)
    try {
      const result = await requestPasswordResetAction(email, locale)
      if (!result.success) {
        setLinkError(tCommon("error"))
        return
      }
      setLinkSuccess(t("resetLinkSent"))
    } catch {
      setLinkError(tCommon("error"))
    } finally {
      setIsSendingLink(false)
    }
  }

  const busy = isLoading || isSendingLink

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className={FORM_CARD_CLASS}>
        <div className={FORM_CARD_BODY_CLASS}>
          <div className={FORM_FIELD_GRID_CLASS}>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="current-password">{t("currentPassword")}</Label>
              <Input
                id="current-password"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                disabled={busy}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="new-password">{t("newPassword")}</Label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={busy}
                required
              />
              <p className="text-xs text-muted-foreground">{tAuth("passwordRulesHint")}</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirm-password">{t("confirmPassword")}</Label>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={busy}
                required
              />
            </div>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {success ? (
            <p className="text-sm text-emerald-600 dark:text-emerald-400">{success}</p>
          ) : null}
        </div>

        <div className={FORM_CARD_FOOTER_CLASS}>
          <Button
            type="submit"
            disabled={busy || !currentPassword || !newPassword || !confirmPassword}
            className={FORM_CARD_ACTION_CLASS}
          >
            {isLoading ? tCommon("loading") : t("changePassword")}
          </Button>
        </div>
      </form>

      {email ? (
        <div className={FORM_CARD_CLASS}>
          <div className={FORM_CARD_BODY_CLASS}>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">{t("sendResetLinkTitle")}</p>
              <p className="text-sm text-muted-foreground">
                {t("sendResetLinkDescription", { email })}
              </p>
            </div>

            {linkError ? <p className="text-sm text-destructive">{linkError}</p> : null}
            {linkSuccess ? (
              <p className="text-sm text-emerald-600 dark:text-emerald-400">{linkSuccess}</p>
            ) : null}
          </div>

          <div className={FORM_CARD_FOOTER_CLASS}>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={handleSendResetLink}
              className={FORM_CARD_ACTION_CLASS}
            >
              {isSendingLink ? tCommon("sending") : t("sendResetLink")}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
