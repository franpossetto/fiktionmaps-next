"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import type { UserProfile } from "@/lib/modules/users"
import { Share2, Settings, Instagram, Twitter, ImageIcon, Heart } from "lucide-react"
import Image from "next/image"
import { useAuth } from "@/context/auth-context"
import {
  HERO_IMAGES,
  getStoredHeroImage,
  setStoredHeroImage,
  DEFAULT_HERO_URL,
  DEFAULT_HERO_POSITION,
  type HeroPosition,
} from "@/lib/constants/hero-images"
import onboardingData from "@/data/onboarding.json"
import { cn } from "@/lib/utils"

interface ProfileHeaderProps {
  profile: UserProfile
  onEdit?: () => void
  onShare?: () => void
}

export function ProfileHeader({ profile, onEdit, onShare }: ProfileHeaderProps) {
  const { preferences } = useAuth()
  const [heroUrl, setHeroUrl] = useState(DEFAULT_HERO_URL)
  const [heroPosition, setHeroPosition] = useState<HeroPosition>(DEFAULT_HERO_POSITION)
  const [showHeroPicker, setShowHeroPicker] = useState(false)
  const [storedGenres, setStoredGenres] = useState<string[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const dragRef = useRef<{
    startX: number
    startY: number
    startPos: HeroPosition
    width: number
    height: number
  } | null>(null)

  const AVATARS = useMemo(
    () =>
      (onboardingData.avatars as { id: string; label: string; url: string }[]).slice(0, 8),
    [],
  )

  const avatarUrl = useMemo(() => {
    const allowedUrls = new Set(AVATARS.map((a) => a.url))
    const prefsAvatar = preferences?.avatar

    if (prefsAvatar && allowedUrls.has(prefsAvatar)) {
      return prefsAvatar
    }

    if (profile.avatar && allowedUrls.has(profile.avatar)) {
      return profile.avatar
    }

    // Fallback: always pick one of the available avatars
    if (AVATARS.length > 0) {
      // Try to pick a stable avatar based on profile id or username
      const seed = (profile.id || profile.username || "").length
      const index = seed % AVATARS.length
      return AVATARS[index].url
    }

    return profile.avatar
  }, [AVATARS, preferences?.avatar, profile.avatar, profile.id, profile.username])

  useEffect(() => {
    const stored = getStoredHeroImage()
    setHeroUrl(stored.src)
    setHeroPosition(stored.position)
  }, [])

  useEffect(() => {
    try {
      const raw = localStorage.getItem("fiktionmaps_onboarding_genres")
      setStoredGenres(raw ? (JSON.parse(raw) as string[]) : [])
    } catch {
      setStoredGenres([])
    }
  }, [])

  const handleSelectHero = (url: string) => {
    setHeroUrl(url)
    setHeroPosition({ ...DEFAULT_HERO_POSITION })
  }

  const handleConfirmHero = () => {
    setStoredHeroImage(heroUrl, heroPosition)
    setShowHeroPicker(false)
  }

  const handlePointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    const targetUrl = event.currentTarget.dataset.hero
    if (!targetUrl || targetUrl !== heroUrl) return
    if (event.pointerType === "mouse" && event.button !== 0) return

    const rect = event.currentTarget.getBoundingClientRect()
    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      startPos: { ...heroPosition },
      width: rect.width || 1,
      height: rect.height || 1,
    }
    setIsDragging(true)
    event.currentTarget.setPointerCapture(event.pointerId)
    event.preventDefault()
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragRef.current) return
    const { startX, startY, startPos, width, height } = dragRef.current
    const dx = event.clientX - startX
    const dy = event.clientY - startY
    const nextX = Math.max(0, Math.min(100, startPos.x + (dx / width) * 100))
    const nextY = Math.max(0, Math.min(100, startPos.y + (dy / height) * 100))
    setHeroPosition({ x: nextX, y: nextY })
  }

  const handlePointerUp = () => {
    if (!dragRef.current) return
    dragRef.current = null
    setIsDragging(false)
  }

  const onboardingTags = preferences?.genres?.length ? preferences.genres : storedGenres

  return (
    <div className="space-y-0">
      {/* Hero — full-width image, no rounded corners */}
      <div className="relative h-[220px] sm:h-[280px] lg:h-[340px] w-full overflow-hidden bg-muted">
        <Image
          src={heroUrl}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
          style={{ objectPosition: `${heroPosition.x}% ${heroPosition.y}%` }}
        />
        {/* Degradado suave a fondo (light/dark) sin línea dura */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        <button
          type="button"
          onClick={() => setShowHeroPicker(true)}
          className="absolute bottom-3 right-3 flex items-center gap-2 rounded-full border border-white/20 bg-black/40 px-3 py-1.5 text-xs font-medium text-white/95 backdrop-blur-sm transition hover:bg-black/50"
          aria-label="Change cover image"
        >
          <ImageIcon className="h-3.5 w-3.5" />
          Cover
        </button>
      </div>

      {/* Hero image picker — simplified, more like Gather-style gallery */}
      {showHeroPicker && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            aria-hidden
            onClick={() => setShowHeroPicker(false)}
          />
          <div className="fixed left-1/2 top-1/2 z-50 w-[min(640px,100vw-2rem)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-background/95 p-5 shadow-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="mb-4">
              <p className="text-sm font-semibold text-foreground">
                Choose your cover
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Pick one of the curated images. You can change it anytime.
              </p>
            </div>
            <div className="grid grid-cols-4 gap-3 overflow-y-auto pr-1 pb-1">
              {HERO_IMAGES.slice(0, 8).map((hero) => (
                <button
                  key={hero.id}
                  type="button"
                  data-hero={hero.url}
                  onClick={() => handleSelectHero(hero.url)}
                  className={cn(
                    "relative aspect-[4/3] overflow-hidden rounded-xl border transition-all",
                    heroUrl === hero.url
                      ? "border-foreground ring-2 ring-foreground/25"
                      : "border-border hover:border-muted-foreground/60 hover:bg-muted/40"
                  )}
                >
                  <Image
                    src={hero.url}
                    alt={hero.label}
                    fill
                    sizes="140px"
                    className="object-cover"
                  />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-1.5 pb-1.5 pt-4">
                    <p className="truncate text-[11px] font-medium text-white">
                      {hero.label}
                    </p>
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
              className="mt-4 w-full rounded-lg border border-border py-2 text-sm font-medium text-foreground hover:bg-muted/60"
            >
              Save
            </button>
          </div>
        </>
      )}

      {/* Profile content — calm hierarchy, alineado al mismo margen izquierdo */}
      <div className="pl-6 pr-4 pt-6 space-y-6">
        <div className="flex items-end justify-between gap-4">
          <div className="flex items-end gap-5">
            {/* Avatar: the one chosen in onboarding */}
            <div className="relative -mt-14 shrink-0">
              <div className="h-28 w-28 overflow-hidden rounded-2xl border-[3px] border-background bg-muted shadow-xl ring-1 ring-black/5">
                <Image
                  src={avatarUrl}
                  alt={profile.username}
                  width={112}
                  height={112}
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
            <div className="pb-1">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                {profile.username}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2 pb-1">
            {onShare && (
              <button
                onClick={onShare}
                className="rounded-xl p-2.5 text-muted-foreground transition hover:bg-muted/60 hover:text-foreground"
                title="Share profile"
              >
                <Share2 className="h-5 w-5" />
              </button>
            )}
            {onEdit && (
              <button
                onClick={onEdit}
                className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 px-3.5 py-2 text-sm font-medium text-foreground transition hover:bg-muted/50"
              >
                <Settings className="h-4 w-4" />
                Edit
              </button>
            )}
          </div>
        </div>

        {profile.bio?.trim() ? (
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {profile.bio}
          </p>
        ) : null}

        {/* Tags from onboarding — read-only, no edit */}
        {onboardingTags.length > 0 && (
          <div>
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Tags
            </p>
            <div className="flex flex-wrap gap-2">
              {onboardingTags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-medium text-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Likes — single, clear metric */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Heart className="h-4 w-4" />
          <span>
            <span className="font-medium text-foreground">0</span> likes
          </span>
        </div>

        {/* Social links — only if present */}
        {profile.socialLinks && (profile.socialLinks.instagram || profile.socialLinks.twitter) && (
          <div className="flex gap-2">
            {profile.socialLinks.instagram && (
              <a
                href={`https://instagram.com/${profile.socialLinks.instagram}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg p-2 text-muted-foreground transition hover:bg-muted/50 hover:text-foreground"
                aria-label="Instagram"
              >
                <Instagram className="h-4 w-4" />
              </a>
            )}
            {profile.socialLinks.twitter && (
              <a
                href={`https://twitter.com/${profile.socialLinks.twitter.replace("@", "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg p-2 text-muted-foreground transition hover:bg-muted/50 hover:text-foreground"
                aria-label="Twitter"
              >
                <Twitter className="h-4 w-4" />
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
