"use client"

import { useState } from "react"
import Image from "next/image"
import { Pencil, Settings, Shield } from "lucide-react"
import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { useAuth } from "@/context/auth-context"
import { useThemeEffectiveBase } from "@/lib/theme-settings-context"
import { getAvatarSrc } from "@/lib/avatars"
import {
  imageFocusToObjectPosition,
  type ImageFocus,
} from "@/lib/asset-images/image-focus"
import type { UserRole } from "@/src/users/domain/user.dtos"
import type { ProfileWithOnboarding } from "@/src/users/infrastructure/next/user.mappers"
import { ProfileAvatarEditor } from "./profile-avatar-editor"
import { ProfileEditPersonalInfoDialog } from "./profile-edit-personal-info-dialog"

type ProfileMetaAsideProps = {
  username: string
  avatar?: string | null
  avatarFocus?: ImageFocus | null
  bio?: string | null
  fullName?: string | null
  gender?: string | null
  phone?: string | null
  dateOfBirth?: string | null
  role: UserRole
  /** Use viewer preferences avatar (own profile only). */
  useViewerAvatarPreferences?: boolean
  /** Show upload affordance (own profile only). */
  canEditAvatar?: boolean
  /** Show personal-info edit (own profile only). */
  canEditPersonalInfo?: boolean
  onAvatarUploaded?: (avatarUrl: string, focus: ImageFocus) => void
  onAvatarFocusSaved?: (focus: ImageFocus) => void
  onPersonalInfoSaved?: (profile: ProfileWithOnboarding) => void
}

export function ProfileMetaAside({
  username,
  avatar,
  avatarFocus = null,
  bio = null,
  fullName = null,
  gender = null,
  phone = null,
  dateOfBirth = null,
  role,
  useViewerAvatarPreferences = false,
  canEditAvatar = false,
  canEditPersonalInfo = false,
  onAvatarUploaded,
  onAvatarFocusSaved,
  onPersonalInfoSaved,
}: ProfileMetaAsideProps) {
  const t = useTranslations("Profile")
  const { preferences, user } = useAuth()
  const theme = useThemeEffectiveBase()
  const [editOpen, setEditOpen] = useState(false)

  const avatarId = (useViewerAvatarPreferences ? preferences?.avatar : null) || avatar || null
  const resolvedAvatarSrc = getAvatarSrc(avatarId, theme)
  const avatarUrl = resolvedAvatarSrc !== "/logo-icon.png" ? resolvedAvatarSrc : null
  const isCustomPhoto = Boolean(avatarUrl?.startsWith("http"))
  const objectPosition = imageFocusToObjectPosition(avatarFocus)

  const handle = username.startsWith("@") ? username : `@${username}`
  const trimmedBio = bio?.trim() || ""
  const trimmedFullName = fullName?.trim() || ""

  return (
    <div className="mx-auto w-full max-w-full space-y-5 pt-1">
      <section className="flex items-start gap-3.5 min-[900px]:flex-col min-[900px]:gap-0 min-[900px]:space-y-3">
        <div className="relative w-20 shrink-0 min-[900px]:w-full">
          <ProfileAvatarEditor
            editable={canEditAvatar}
            currentSrc={avatarUrl}
            canReposition={isCustomPhoto}
            initialFocus={avatarFocus}
            onUploaded={onAvatarUploaded}
            onFocusSaved={onAvatarFocusSaved}
            className="relative aspect-square w-full overflow-hidden rounded-2xl bg-muted ring-1 ring-border/60"
          >
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={username}
                fill
                className="object-cover"
                style={{ objectPosition }}
                sizes="(max-width: 899px) 80px, 266px"
                quality={90}
                priority
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-2xl font-semibold uppercase text-muted-foreground min-[900px]:text-5xl">
                {username?.[0] ?? "?"}
              </div>
            )}
          </ProfileAvatarEditor>
          {role === "admin" ? (
            <span
              tabIndex={0}
              className="group/admin absolute top-0 right-2.5 z-10 flex h-9 w-9 -translate-y-1/2 cursor-default items-center justify-center rounded-full bg-background text-foreground shadow-sm ring-1 ring-border/60 outline-none"
              aria-label={t("roleBadgeHover_admin")}
            >
              <Shield className="h-4 w-4" aria-hidden />
              <span
                role="tooltip"
                className="pointer-events-none absolute top-[calc(100%+8px)] left-1/2 z-20 w-max max-w-[11rem] -translate-x-1/2 rounded-md bg-foreground px-2 py-1 text-center text-[11px] font-medium text-background opacity-0 shadow-sm transition-opacity group-hover/admin:opacity-100 group-focus-within/admin:opacity-100"
              >
                {t("roleBadgeHover_admin")}
              </span>
            </span>
          ) : null}
        </div>

        <div className="min-w-0 min-[900px]:w-full">
          <div className="flex items-center gap-0.5">
            <h1 className="truncate text-base font-semibold leading-tight tracking-tight text-foreground min-[900px]:text-lg">
              {trimmedFullName || username}
            </h1>
            {canEditPersonalInfo ? (
              <>
                <button
                  type="button"
                  onClick={() => setEditOpen(true)}
                  className="shrink-0 rounded-md p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  aria-label={t("editPersonalInfo")}
                  title={t("editPersonalInfo")}
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden />
                </button>
                <Link
                  href="/settings"
                  className="shrink-0 rounded-md p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  aria-label={t("openSettings")}
                  title={t("openSettings")}
                >
                  <Settings className="h-3.5 w-3.5" aria-hidden />
                </Link>
              </>
            ) : null}
          </div>
          <p className="mt-0.5 truncate text-sm text-muted-foreground">{handle}</p>
          {trimmedBio ? (
            <p className="mt-2 text-xs leading-relaxed text-foreground/90">{trimmedBio}</p>
          ) : null}
        </div>
      </section>

      {canEditPersonalInfo ? (
        <ProfileEditPersonalInfoDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          username={username}
          email={user?.email}
          initial={{
            fullName: trimmedFullName,
            bio: trimmedBio,
            gender: gender ?? "",
            phone: phone ?? "",
            dateOfBirth: dateOfBirth ?? "",
          }}
          onSaved={(profile) => onPersonalInfoSaved?.(profile)}
        />
      ) : null}
    </div>
  )
}
