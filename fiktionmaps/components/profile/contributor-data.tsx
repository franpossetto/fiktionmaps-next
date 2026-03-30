"use client"

import type { Location } from "@/src/locations"
import type { FictionWithMedia } from "@/src/fictions/fiction.domain"
import type { CheckIn } from "@/src/users"
import { Upload } from "lucide-react"
import Image from "next/image"
import { DEFAULT_FICTION_COVER } from "@/lib/constants/placeholders"

interface ContributorDataProps {
  uploadedLocations: Location[]
  uploadedFictions: FictionWithMedia[]
  contributedPhotos: CheckIn[]
}

export function ContributorData({
  uploadedLocations,
  uploadedFictions,
  contributedPhotos,
}: ContributorDataProps) {
  const totalContributions = uploadedLocations.length + uploadedFictions.length + contributedPhotos.length

  if (totalContributions === 0) {
    return (
      <div>
        <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground mb-3">
          Contributions
        </h3>
        <div className="flex items-center gap-3 py-2 text-sm text-muted-foreground">
          <Upload className="h-4 w-4 shrink-0 text-muted-foreground/40" />
          Upload fictions, places, and scenes to build the community.
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Fictions */}
      {uploadedFictions.length > 0 && (
        <div>
          <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground mb-2">
            Fictions
            <span className="ml-1.5 text-muted-foreground/60">{uploadedFictions.length}</span>
          </h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2">
            {uploadedFictions.map((fiction) => (
              <div
                key={fiction.id}
                className="group relative aspect-[2/3] overflow-hidden rounded-md bg-muted"
              >
                <Image
                  src={fiction.coverImage?.trim() || DEFAULT_FICTION_COVER}
                  alt={fiction.title}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-2">
                  <p className="text-sm font-medium text-white line-clamp-2 leading-tight">
                    {fiction.title}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Places */}
      {uploadedLocations.length > 0 && (
        <div>
          <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground mb-2">
            Places
            <span className="ml-1.5 text-muted-foreground/60">{uploadedLocations.length}</span>
          </h3>
          <div className="divide-y divide-border/40">
            {uploadedLocations.map((location) => (
              <div key={location.id} className="flex items-center gap-3 py-2.5">
                <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-md bg-muted">
                  <Image src={location.image} alt={location.name} fill className="object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{location.name}</p>
                  <p className="text-sm text-muted-foreground truncate">{location.address}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Scenes */}
      {contributedPhotos.length > 0 && (
        <div>
          <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground mb-2">
            Scenes
            <span className="ml-1.5 text-muted-foreground/60">{contributedPhotos.length}</span>
          </h3>
          <div className="grid grid-cols-3 gap-1">
            {contributedPhotos.map((photo) => (
              <div key={photo.id} className="relative aspect-square overflow-hidden bg-muted rounded-sm">
                {photo.photoUrl && (
                  <Image src={photo.photoUrl} alt="" fill className="object-cover" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
