"use client"

import { useEffect, useState, useTransition } from "react"
import { Loader2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { updateMyProfilePersonalInfoAction } from "@/src/users/infrastructure/next/user.actions"
import type { ProfileWithOnboarding } from "@/src/users/infrastructure/next/user.mappers"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  FORM_CARD_BODY_CLASS,
  FORM_CARD_CLASS,
  FORM_CARD_FOOTER_CLASS,
  FORM_FIELD_GRID_CLASS,
} from "@/components/ui/form-card"
import { cn } from "@/lib/utils"

const GENDER_OPTIONS = [
  { value: "", labelKey: "genderSelect" as const },
  { value: "female", labelKey: "genderFemale" as const },
  { value: "male", labelKey: "genderMale" as const },
  { value: "non_binary", labelKey: "genderNonBinary" as const },
  { value: "other", labelKey: "genderOther" as const },
  { value: "prefer_not", labelKey: "genderPreferNot" as const },
]

const SELECT_CLASS = cn(
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
  "ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
  "disabled:cursor-not-allowed disabled:opacity-50",
)

export type ProfilePersonalInfoInitial = {
  fullName?: string
  bio?: string
  gender?: string
  phone?: string
  dateOfBirth?: string
}

type ProfilePersonalInfoFormProps = {
  username: string
  email?: string | null
  initial: ProfilePersonalInfoInitial
  onSaved: (profile: ProfileWithOnboarding) => void
  onCancel?: () => void
  idPrefix?: string
  className?: string
  saveButtonClassName?: string
  /** `card` frames the fields in a two-column panel with a footer (settings page). */
  variant?: "plain" | "card"
}

export function ProfilePersonalInfoForm({
  username,
  email,
  initial,
  onSaved,
  onCancel,
  idPrefix = "profile",
  className,
  saveButtonClassName,
  variant = "plain",
}: ProfilePersonalInfoFormProps) {
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
    setFullName(initial.fullName ?? "")
    setBio(initial.bio ?? "")
    setGender(initial.gender ?? "")
    setPhone(initial.phone ?? "")
    setDateOfBirth(initial.dateOfBirth?.slice(0, 10) ?? "")
    setError(null)
  }, [initial.fullName, initial.bio, initial.gender, initial.phone, initial.dateOfBirth])

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
    })
  }

  const isCard = variant === "card"
  const handle = username.startsWith("@") ? username : `@${username}`
  const fieldId = (name: string) => `${idPrefix}-${name}`

  const fields = (
    <div className={isCard ? FORM_FIELD_GRID_CLASS : "space-y-4"}>
      <div className="space-y-1.5">
        <Label htmlFor={fieldId("username")}>{t("fieldUsername")}</Label>
        <Input id={fieldId("username")} value={handle} disabled readOnly />
        <p className="text-xs text-muted-foreground">{t("fieldUsernameHint")}</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={fieldId("email")}>{t("fieldEmail")}</Label>
        <Input id={fieldId("email")} value={email?.trim() || "—"} disabled readOnly />
        <p className="text-xs text-muted-foreground">{t("fieldEmailHint")}</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={fieldId("full-name")}>{t("fieldFullName")}</Label>
        <Input
          id={fieldId("full-name")}
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          maxLength={80}
          disabled={isPending}
          placeholder={t("fieldFullNamePlaceholder")}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={fieldId("dob")}>{t("fieldDateOfBirth")}</Label>
        <Input
          id={fieldId("dob")}
          type="date"
          value={dateOfBirth}
          onChange={(e) => setDateOfBirth(e.target.value)}
          disabled={isPending}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={fieldId("gender")}>{t("fieldGender")}</Label>
        <select
          id={fieldId("gender")}
          value={gender}
          onChange={(e) => setGender(e.target.value)}
          disabled={isPending}
          className={SELECT_CLASS}
        >
          {GENDER_OPTIONS.map((opt) => (
            <option key={opt.value || "empty"} value={opt.value}>
              {t(opt.labelKey)}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={fieldId("phone")}>{t("fieldPhone")}</Label>
        <Input
          id={fieldId("phone")}
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          maxLength={40}
          disabled={isPending}
          placeholder={t("fieldPhonePlaceholder")}
        />
      </div>

      <div className={cn("space-y-1.5", isCard && "sm:col-span-2")}>
        <Label htmlFor={fieldId("bio")}>{t("fieldBio")}</Label>
        <Textarea
          id={fieldId("bio")}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={500}
          rows={3}
          disabled={isPending}
          placeholder={t("fieldBioPlaceholder")}
        />
      </div>
    </div>
  )

  const errorMessage = error ? (
    <p className="text-xs text-destructive" role="alert">
      {error}
    </p>
  ) : null

  const actions = (
    <>
      {onCancel ? (
        <Button type="button" variant="outline" disabled={isPending} onClick={onCancel}>
          {t("cancelEdit")}
        </Button>
      ) : null}
      <Button
        type="button"
        disabled={isPending}
        onClick={onSave}
        className={saveButtonClassName}
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
            {t("savingPersonalInfo")}
          </>
        ) : (
          t("savePersonalInfo")
        )}
      </Button>
    </>
  )

  if (isCard) {
    return (
      <div className={cn(FORM_CARD_CLASS, className)}>
        <div className={FORM_CARD_BODY_CLASS}>
          {fields}
          {errorMessage}
        </div>
        <div className={FORM_CARD_FOOTER_CLASS}>{actions}</div>
      </div>
    )
  }

  return (
    <div className={cn("space-y-4", className)}>
      {fields}
      {errorMessage}
      <div className="flex justify-end gap-2">{actions}</div>
    </div>
  )
}
