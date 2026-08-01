"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Share2, Settings, ImageIcon } from "lucide-react"
import { useAuth } from "@/context/auth-context"
import {
  HERO_IMAGES,
  getStoredHeroImage,
  setStoredHeroImage,
  DEFAULT_HERO_URL,
  DEFAULT_HERO_POSITION,
  type HeroPosition,
} from "@/lib/constants/hero-images"
import { useThemeEffectiveBase } from "@/lib/theme-settings-context"
import { getAvatarSrc } from "@/lib/avatars"
import { cn } from "@/lib/utils"
import type { UserProfile } from "@/src/users/domain/user.views"

/** Re-enable the hero cover strip when we ship it again (set to true). */
const SHOW_PROFILE_HERO_BANNER = false

interface ProfileHeaderProps {
  profile: UserProfile
  fpp: number
  roleLabel: string
  onEdit?: () => void
  onShare?: () => void
  /** When true, hides the hero banner and shows a single compact row (e.g. after starting a mission). */
  compact?: boolean
}

export function ProfileHeader({
  profile,
  fpp,
  roleLabel,
  onEdit,
  onShare,
  compact = false,
}: ProfileHeaderProps) {
  const { preferences } = useAuth()
  const [heroUrl, setHeroUrl] = useState<string>(DEFAULT_HERO_URL)
  const [heroPosition, setHeroPosition] = useState<HeroPosition>(DEFAULT_HERO_POSITION)
  const [showHeroPicker, setShowHeroPicker] = useState(false)

  const theme = useThemeEffectiveBase()
  const avatarId = preferences?.avatar || profile.avatar || null
  const resolvedAvatarSrc = getAvatarSrc(avatarId, theme)
  const avatarUrl = resolvedAvatarSrc !== "/logo-icon.png" ? resolvedAvatarSrc : null

  useEffect(() => {
    const stored = getStoredHeroImage()
    setHeroUrl(stored.src)
    setHeroPosition(stored.position)
  }, [])

  const joinYear = profile.joinedDate
    ? new Date(profile.joinedDate).getFullYear()
    : new Date().getFullYear()

  const handle = profile.username?.startsWith("@")
    ? profile.username
    : `@${profile.username}`

  if (compact) {
    return (
      <div className="border-b border-border/50 px-5 py-4">
        <div className="flex items-center gap-3.5">
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl border-2 border-border bg-muted">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={profile.username}
                width={56}
                height={56}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-muted text-lg font-bold text-muted-foreground uppercase">
                {profile.username?.[0] ?? "?"}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-2xl font-bold leading-tight text-foreground">{profile.username}</h1>
            <p className="truncate text-sm text-muted-foreground">{handle}</p>
            <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-emerald-500/15 px-2 py-0.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                <span className="h-1 w-1 shrink-0 rounded-full bg-emerald-500 dark:bg-emerald-400" />
                <span className="truncate">{roleLabel}</span>
              </span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {onShare && (
              <button
                type="button"
                onClick={onShare}
                className="rounded-md p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                title="Share"
              >
                <Share2 className="h-4 w-4" />
              </button>
            )}
            {onEdit && (
              <button
                type="button"
                onClick={onEdit}
                className="rounded-md p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                title="Settings"
              >
                <Settings className="h-4 w-4" />
              </button>
            )}
            <div className="text-right pl-1">
              <p className="text-lg font-bold leading-none text-foreground">{fpp.toLocaleString()}</p>
              <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">FPP</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      {SHOW_PROFILE_HERO_BANNER && (
        <div className="relative h-36 sm:h-44 w-full overflow-hidden bg-muted">
          <Image
            src={heroUrl}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
            style={{ objectPosition: `${heroPosition.x}% ${heroPosition.y}%` }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
          <button
            type="button"
            onClick={() => setShowHeroPicker(true)}
            className="absolute bottom-3 right-4 flex items-center gap-1.5 rounded-md bg-black/40 px-2 py-1 text-sm text-white/80 backdrop-blur-sm transition hover:bg-black/50"
            aria-label="Change cover image"
          >
            <ImageIcon className="h-3 w-3" />
            Cover
          </button>
        </div>
      )}

      <div
        className={cn(
          "flex flex-col gap-5 border-b border-border/40 pb-8 sm:flex-row sm:items-start sm:justify-between",
          SHOW_PROFILE_HERO_BANNER ? "pt-4" : "pt-1",
        )}
      >
        <div className="flex min-w-0 items-start gap-4">
          <div
            className={cn(
              "relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border-[3px] border-background bg-muted sm:h-28 sm:w-28",
              SHOW_PROFILE_HERO_BANNER && "-mt-16",
            )}
          >
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={profile.username}
                width={112}
                height={112}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-muted text-3xl font-bold text-muted-foreground uppercase">
                {profile.username?.[0] ?? "?"}
              </div>
            )}
          </div>

          <div className="min-w-0 pt-1">
            <h1 className="text-3xl font-bold tracking-tight text-foreground leading-[1.1] sm:text-4xl">
              {profile.username}
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground sm:text-base">
              {handle} · {joinYear}
            </p>
            <div className="mt-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />
                {roleLabel}
              </span>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-end sm:gap-2">
          <div className="flex items-center gap-1">
            {onShare && (
              <button
                type="button"
                onClick={onShare}
                className="rounded-md p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                title="Share"
              >
                <Share2 className="h-4 w-4" />
              </button>
            )}
            {onEdit && (
              <button
                type="button"
                onClick={onEdit}
                className="rounded-md p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                title="Settings"
              >
                <Settings className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="text-left sm:text-right">
            <p className="text-2xl font-bold leading-none text-foreground">{fpp.toLocaleString()}</p>
            <p className="mt-0.5 text-sm font-medium uppercase tracking-widest text-muted-foreground">FPP</p>
          </div>
        </div>
      </div>

      {showHeroPicker && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            aria-hidden
            onClick={() => setShowHeroPicker(false)}
          />
          <div className="fixed left-1/2 top-1/2 z-50 flex max-h-[80vh] w-[min(520px,100vw-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-border bg-background p-5 shadow-xl">
            <p className="mb-1 text-sm font-semibold text-foreground">Choose your cover</p>
            <p className="mb-4 text-sm text-muted-foreground">Pick an image. You can change it anytime.</p>
            <div className="grid grid-cols-4 gap-2 overflow-y-auto pb-1 pr-1">
              {HERO_IMAGES.slice(0, 8).map((hero) => (
                <button
                  key={hero.id}
                  type="button"
                  onClick={() => {
                    setHeroUrl(hero.url)
                    setHeroPosition({ ...DEFAULT_HERO_POSITION })
                  }}
                  className={cn(
                    "relative aspect-[4/3] overflow-hidden rounded-lg border transition-all",
                    heroUrl === hero.url
                      ? "border-foreground ring-2 ring-foreground/20"
                      : "border-border hover:border-muted-foreground/50",
                  )}
                >
                  <Image src={hero.url} alt={hero.label} fill sizes="120px" className="object-cover" />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-1.5 pb-1 pt-3">
                    <p className="truncate text-sm font-medium text-white">{hero.label}</p>
                  </div>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                setStoredHeroImage(heroUrl, heroPosition)
                setShowHeroPicker(false)
              }}
              className="mt-4 w-full rounded-lg bg-foreground py-2 text-sm font-medium text-background transition hover:opacity-90"
            >
              Save
            </button>
          </div>
        </>
      )}
    </div>
  )
}
