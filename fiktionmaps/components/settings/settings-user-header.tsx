"use client"

import Image from "next/image"
import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { useAuth } from "@/context/auth-context"
import { useThemeEffectiveBase } from "@/lib/theme-settings-context"
import { getAvatarSrc } from "@/lib/avatars"
import {
  imageFocusToObjectPosition,
  type ImageFocus,
} from "@/lib/asset-images/image-focus"
import { publicUserProfilePath } from "@/lib/users/public-profile-path"

type SettingsUserHeaderProps = {
  username: string
  fullName?: string | null
  avatar?: string | null
  avatarFocus?: ImageFocus | null
}

export function SettingsUserHeader({
  username,
  fullName = null,
  avatar = null,
  avatarFocus = null,
}: SettingsUserHeaderProps) {
  const t = useTranslations("Settings")
  const { preferences } = useAuth()
  const theme = useThemeEffectiveBase()

  const avatarId = preferences?.avatar || avatar || null
  const resolvedAvatarSrc = getAvatarSrc(avatarId, theme)
  const avatarUrl = resolvedAvatarSrc !== "/logo-icon.png" ? resolvedAvatarSrc : null
  const objectPosition = imageFocusToObjectPosition(avatarFocus)
  const handle = username.startsWith("@") ? username : `@${username}`
  const displayName = fullName?.trim() || username
  const profileHref = publicUserProfilePath(username)

  return (
    <Link
      href={profileHref}
      className="flex items-center gap-3 rounded-xl p-1 transition hover:bg-muted/40"
      aria-label={t("viewProfile")}
    >
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-muted ring-1 ring-border/60">
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt={displayName}
            fill
            className="object-cover"
            style={{ objectPosition }}
            sizes="48px"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm font-semibold uppercase text-muted-foreground">
            {displayName?.[0] ?? "?"}
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold leading-tight text-foreground">
          {displayName}
        </p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{handle}</p>
      </div>
    </Link>
  )
}
