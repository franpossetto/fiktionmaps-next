"use client"

import { useTranslations } from "next-intl"
import type { ProfileWithOnboarding } from "@/src/users/infrastructure/next/user.mappers"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  ProfilePersonalInfoForm,
  type ProfilePersonalInfoInitial,
} from "./profile-personal-info-form"

type ProfileEditPersonalInfoDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  username: string
  email?: string | null
  initial: ProfilePersonalInfoInitial
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("editPersonalInfoTitle")}</DialogTitle>
        </DialogHeader>

        {open ? (
          <ProfilePersonalInfoForm
            username={username}
            email={email}
            initial={initial}
            onCancel={() => onOpenChange(false)}
            onSaved={(profile) => {
              onSaved(profile)
              onOpenChange(false)
            }}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
