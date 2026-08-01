"use client"

import { useEffect, useState, useTransition } from "react"
import { Loader2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { updateMyProfilePersonalInfoAction } from "@/src/users/infrastructure/next/user.actions"
import type { ProfileWithOnboarding } from "@/src/users/infrastructure/next/user.mappers"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

const GENDER_OPTIONS = [
  { value: "", labelKey: "genderSelect" as const },
  { value: "female", labelKey: "genderFemale" as const },
  { value: "male", labelKey: "genderMale" as const },
  { value: "non_binary", labelKey: "genderNonBinary" as const },
  { value: "other", labelKey: "genderOther" as const },
  { value: "prefer_not", labelKey: "genderPreferNot" as const },
]

type ProfileEditPersonalInfoDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  username: string
  email?: string | null
  initial: {
    fullName?: string
    bio?: string
    gender?: string
    phone?: string
    dateOfBirth?: string
  }
  onSaved: (profile: ProfileWithOnboarding) => void
}

export function ProfileEditPersonalInfoDialog({
  open,
  onOpenChange,
  username,
  email,
  initial,
  onSaved,
}: ProfileEditPersonalInfoDialogProps) {
  const t = useTranslations("Profile")
  const [fullName, setFullName] = useState(initial.fullName ?? "")
  const [bio, setBio] = useState(initial.bio ?? "")
  const [gender, setGender] = useState(initial.gender ?? "")
  const [phone, setPhone] = useState(initial.phone ?? "")
  const [dateOfBirth, setDateOfBirth] = useState(
    initial.dateOfBirth?.slice(0, 10) ?? ""
  )
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (!open) return
    setFullName(initial.fullName ?? "")
    setBio(initial.bio ?? "")
    setGender(initial.gender ?? "")
    setPhone(initial.phone ?? "")
    setDateOfBirth(initial.dateOfBirth?.slice(0, 10) ?? "")
    setError(null)
  }, [open, initial.fullName, initial.bio, initial.gender, initial.phone, initial.dateOfBirth])

  function onSave() {
    startTransition(async () => {
      setError(null)
      const result = await updateMyProfilePersonalInfoAction({
        full_name: fullName,
        bio,
        gender,
        phone,
        date_of_birth: dateOfBirth,
      })
      if (!result.success) {
        setError(result.error)
        return
      }
      onSaved(result.profile)
      onOpenChange(false)
    })
  }

  const handle = username.startsWith("@") ? username : `@${username}`

  return (
    <Dialog open={open} onOpenChange={(next) => !isPending && onOpenChange(next)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("editPersonalInfoTitle")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="profile-username">{t("fieldUsername")}</Label>
            <Input id="profile-username" value={handle} disabled readOnly />
            <p className="text-xs text-muted-foreground">{t("fieldUsernameHint")}</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="profile-email">{t("fieldEmail")}</Label>
            <Input id="profile-email" value={email?.trim() || "—"} disabled readOnly />
            <p className="text-xs text-muted-foreground">{t("fieldEmailHint")}</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="profile-full-name">{t("fieldFullName")}</Label>
            <Input
              id="profile-full-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              maxLength={80}
              disabled={isPending}
              placeholder={t("fieldFullNamePlaceholder")}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="profile-bio">{t("fieldBio")}</Label>
            <Textarea
              id="profile-bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={500}
              rows={3}
              disabled={isPending}
              placeholder={t("fieldBioPlaceholder")}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="profile-gender">{t("fieldGender")}</Label>
            <select
              id="profile-gender"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              disabled={isPending}
              className={cn(
                "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
                "ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                "disabled:cursor-not-allowed disabled:opacity-50"
              )}
            >
              {GENDER_OPTIONS.map((opt) => (
                <option key={opt.value || "empty"} value={opt.value}>
                  {t(opt.labelKey)}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="profile-phone">{t("fieldPhone")}</Label>
            <Input
              id="profile-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              maxLength={40}
              disabled={isPending}
              placeholder={t("fieldPhonePlaceholder")}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="profile-dob">{t("fieldDateOfBirth")}</Label>
            <Input
              id="profile-dob"
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              disabled={isPending}
            />
          </div>

          {error ? (
            <p className="text-xs text-destructive" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => onOpenChange(false)}
          >
            {t("cancelEdit")}
          </Button>
          <Button type="button" disabled={isPending} onClick={onSave}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                {t("savingPersonalInfo")}
              </>
            ) : (
              t("savePersonalInfo")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
