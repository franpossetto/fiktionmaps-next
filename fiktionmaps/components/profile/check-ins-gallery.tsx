"use client"

import { useEffect, useState } from "react"
import type { CheckIn } from "@/lib/modules/users"
import type { Location } from "@/lib/modules/locations"
import type { Fiction } from "@/lib/modules/fictions"
import { useApi } from "@/lib/api"
import { Heart, MessageCircle, Share2 } from "lucide-react"
import Image from "next/image"

interface CheckInsGalleryProps {
  checkIns: CheckIn[]
  onShare?: (checkIn: CheckIn) => void
}

export function CheckInsGallery({ checkIns, onShare }: CheckInsGalleryProps) {
  const { locations, fictions } = useApi()
  const [locationMap, setLocationMap] = useState<Map<string, Location>>(new Map())
  const [fictionMap, setFictionMap] = useState<Map<string, Fiction>>(new Map())

  useEffect(() => {
    Promise.all([locations.getAll(), fictions.getAll()]).then(([locs, fics]) => {
      setLocationMap(new Map(locs.map((l) => [l.id, l])))
      setFictionMap(new Map(fics.map((f) => [f.id, f])))
    })
  }, [locations, fictions])

  if (checkIns.length === 0) {
    return (
      <div className="text-center py-12 px-6">
        <MessageCircle className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-muted-foreground">No check-ins yet. Share your first moment!</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {checkIns.map((checkIn) => {
        const location = locationMap.get(checkIn.locationId)
        const fiction = location ? fictionMap.get(location.fictionId) : undefined

        return (
          <div key={checkIn.id} className="rounded-xl border border-border bg-card/50 overflow-hidden hover:border-cyan-500/30 transition-colors">
            {/* Photo */}
            {checkIn.photoUrl && (
              <div className="relative h-80 w-full overflow-hidden bg-muted">
                <Image
                  src={checkIn.photoUrl}
                  alt="Check-in photo"
                  fill
                  className="object-cover"
                  loading="eager"
                />
              </div>
            )}

            {/* Content */}
            <div className="p-4 space-y-3">
              {/* Location info */}
              {location && (
                <div>
                  <p className="font-bold text-foreground">{location.name}</p>
                  {fiction && <p className="text-xs text-cyan-300/80">{fiction.title}</p>}
                </div>
              )}

              {/* Caption */}
              {checkIn.caption && (
                <p className="text-sm text-foreground/80">{checkIn.caption}</p>
              )}

              {/* Timestamp */}
              <p className="text-xs text-muted-foreground">
                {new Date(checkIn.timestamp).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>

              {/* Actions */}
              <div className="flex items-center gap-4 pt-2 border-t border-border/50">
                <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-red-400 transition-colors group">
                  <Heart
                    className={`h-4 w-4 ${checkIn.liked ? "fill-red-400 text-red-400" : ""}`}
                  />
                  <span className="text-xs">{checkIn.likeCount}</span>
                </button>
                <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-cyan-400 transition-colors">
                  <MessageCircle className="h-4 w-4" />
                  <span className="text-xs">0</span>
                </button>
                {onShare && (
                  <button
                    onClick={() => onShare(checkIn)}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-cyan-400 transition-colors ml-auto"
                  >
                    <Share2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
