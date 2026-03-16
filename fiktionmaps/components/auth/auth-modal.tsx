"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { useAuth } from "@/context/auth-context"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface AuthModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AuthModal({ open, onOpenChange }: AuthModalProps) {
  const t = useTranslations("Auth")
  const tCommon = useTranslations("Common")
  const { login, signup, isLoading } = useAuth()
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    try {
      if (isLogin) {
        await login(email, password)
      } else {
        if (!name.trim()) {
          setError(t("pleaseEnterYourName"))
          return
        }
        await signup(email, password, name)
      }
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : tCommon("error"))
    }
  }

  const handleReset = () => {
    setEmail("")
    setPassword("")
    setName("")
    setError("")
    setIsLogin(true)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => {
      if (!v) handleReset()
      onOpenChange(v)
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isLogin ? t("signInTitle") : t("createAccountTitle")}</DialogTitle>
          <DialogDescription>
            {isLogin ? t("welcomeBack") : t("joinFiktionMaps")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="text-sm font-medium text-foreground">{t("fullName")}</label>
              <Input
                type="text"
                placeholder={t("fullNamePlaceholder")}
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
                className="mt-1.5"
              />
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-foreground">{t("emailLabel")}</label>
            <Input
              type="email"
              placeholder={t("emailPlaceholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              required
              className="mt-1.5"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground">{t("password")}</label>
            <Input
              type="password"
              placeholder={t("passwordPlaceholder")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              required
              className="mt-1.5"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button
            type="submit"
            disabled={isLoading || !email || !password || (!isLogin && !name)}
            className="w-full"
          >
            {isLoading ? tCommon("loading") : isLogin ? t("signInTitle") : t("createAccountTitle")}
          </Button>
        </form>

        <div className="border-t border-border pt-4 text-center text-sm">
          <p className="text-muted-foreground">
            {isLogin ? t("dontHaveAccount") : t("alreadyHaveAccount")}
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin)
                setError("")
              }}
              className="font-medium text-primary hover:underline"
            >
              {isLogin ? t("signUpTitle") : t("signInTitle")}
            </button>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
