"use client"

import { useEffect, useState } from "react"
import type { UserProfile, Interest } from "@/lib/modules/users"
import { Share2, Settings, Instagram, Twitter } from "lucide-react"
import Image from "next/image"

interface ProfileHeaderProps {
  profile: UserProfile
  onEdit?: () => void
  onShare?: () => void
  contributionStats?: {
    fictions: number
    places: number
    scenes: number
  }
}

const INTEREST_OPTIONS: Interest[] = [
  "adventure",
  "romance",
  "comedy",
  "drama",
  "fantasy",
  "thriller",
  "sci-fi",
  "history",
]

export function ProfileHeader({ profile, onEdit, onShare, contributionStats }: ProfileHeaderProps) {
  const [editingInterests, setEditingInterests] = useState(false)
  const [selectedInterests, setSelectedInterests] = useState<Interest[]>(profile.interests)

  useEffect(() => {
    setSelectedInterests(profile.interests)
  }, [profile.interests])

  const toggleInterest = (interest: Interest) => {
    setSelectedInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest],
    )
  }

  return (
    <div className="space-y-6">
      {/* Cover background gradient */}
      <div className="h-32 rounded-xl bg-gradient-to-r from-cyan-600/20 to-blue-600/20 border border-border/50 overflow-hidden relative">
        <div className="absolute inset-0 bg-grid-pattern opacity-5" />
      </div>

      {/* Profile content */}
      <div className="px-6 space-y-4">
        {/* Avatar and basic info */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-end gap-4">
            <div className="relative -mt-16">
              <div className="w-28 h-28 rounded-2xl border-4 border-background overflow-hidden bg-muted shadow-lg">
                <Image
                  src={profile.avatar}
                  alt={profile.username}
                  width={112}
                  height={112}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <div className="pb-2">
              <h1 className="text-2xl font-bold text-foreground">{profile.username}</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Joined {new Date(profile.joinedDate).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            {onShare && (
              <button
                onClick={onShare}
                className="p-2.5 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                title="Share profile"
              >
                <Share2 className="h-5 w-5 text-foreground" />
              </button>
            )}
            {onEdit && (
              <button
                onClick={onEdit}
                className="px-4 py-2 rounded-lg bg-cyan-600/20 text-cyan-400 hover:bg-cyan-600/30 transition-colors text-sm font-medium border border-cyan-500/30 flex items-center gap-2"
              >
                <Settings className="h-4 w-4" />
                Edit
              </button>
            )}
          </div>
        </div>

        {/* Bio */}
        <p className="text-foreground text-sm leading-relaxed max-w-2xl">{profile.bio}</p>

        {/* Contribution stats */}
        {contributionStats && (
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <span>
              <span className="text-foreground font-semibold">{contributionStats.fictions}</span> Fictions Added
            </span>
            <span>
              <span className="text-foreground font-semibold">{contributionStats.places}</span> Places Added
            </span>
            <span>
              <span className="text-foreground font-semibold">{contributionStats.scenes}</span> Scenes Shared
            </span>
          </div>
        )}

        {/* Social links */}
        {profile.socialLinks && (profile.socialLinks.instagram || profile.socialLinks.twitter) && (
          <div className="flex gap-3">
            {profile.socialLinks.instagram && (
              <a
                href={`https://instagram.com/${profile.socialLinks.instagram}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
              >
                <Instagram className="h-4 w-4 text-foreground" />
              </a>
            )}
            {profile.socialLinks.twitter && (
              <a
                href={`https://twitter.com/${profile.socialLinks.twitter.replace("@", "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
              >
                <Twitter className="h-4 w-4 text-foreground" />
              </a>
            )}
          </div>
        )}

        {/* Interests */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-muted-foreground uppercase">Interests</p>
            <button
              onClick={() => setEditingInterests((v) => !v)}
              className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              {editingInterests ? "Done" : "Edit"}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {(editingInterests ? INTEREST_OPTIONS : selectedInterests).map((interest) => {
              const active = selectedInterests.includes(interest)
              return (
                <button
                  key={interest}
                  type="button"
                  onClick={() => editingInterests && toggleInterest(interest)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors ${
                    editingInterests
                      ? active
                        ? "border-cyan-500/60 bg-cyan-500/20 text-cyan-300"
                        : "border-border bg-muted/30 text-muted-foreground hover:text-foreground"
                      : "border-border bg-muted/30 text-foreground"
                  }`}
                >
                  {interest.charAt(0).toUpperCase() + interest.slice(1)}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
