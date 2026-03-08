"use client"

import { useState } from "react"
import type { Location } from "@/lib/modules/locations"
import type { Fiction } from "@/lib/modules/fictions"
import type { CheckIn } from "@/lib/modules/users"
import { Upload, MapPin, Film } from "lucide-react"
import Image from "next/image"
import { DEFAULT_FICTION_COVER } from "@/lib/constants/placeholders"

interface ContributorDataProps {
  uploadedLocations: Location[]
  uploadedFictions: Fiction[]
  contributedPhotos: CheckIn[]
}

export function ContributorData({
  uploadedLocations,
  uploadedFictions,
  contributedPhotos,
}: ContributorDataProps) {
  const totalContributions = uploadedLocations.length + uploadedFictions.length + contributedPhotos.length
  const [activeTab, setActiveTab] = useState<"fictions" | "places" | "scenes">("fictions")

  if (totalContributions === 0) {
    return (
      <div className="rounded-lg border border-dashed border-cyan-500/30 bg-cyan-500/5 p-12 text-center">
        <Upload className="h-12 w-12 text-cyan-400/50 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-foreground mb-2">Start Contributing</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Upload fictions, places, and scenes to build the community library
        </p>
        <button className="px-4 py-2 rounded-lg bg-cyan-600/20 text-cyan-400 hover:bg-cyan-600/30 transition-colors text-sm font-medium border border-cyan-500/30 flex items-center gap-2 mx-auto">
          <Upload className="h-4 w-4" />
          Upload Data
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-border/40 pb-3">
        {[
          { id: "fictions", label: "Fictions", count: uploadedFictions.length, icon: Film },
          { id: "places", label: "Places", count: uploadedLocations.length, icon: MapPin },
          { id: "scenes", label: "Scenes", count: contributedPhotos.length, icon: Upload },
        ].map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors border ${
                isActive
                  ? "bg-cyan-600/20 text-cyan-300 border-cyan-500/50"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/30 border-transparent"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
              <span className="text-xs text-muted-foreground">({tab.count})</span>
            </button>
          )
        })}
      </div>

      {/* Uploaded Fictions */}
      {activeTab === "fictions" && uploadedFictions.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <Film className="h-5 w-5 text-purple-400" />
            Fictions You Added
          </h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
            {uploadedFictions.map((fiction) => (
              <div
                key={fiction.id}
                className="group w-full rounded-md border border-border overflow-hidden hover:border-purple-500/50 transition-all"
              >
                <div className="relative aspect-[2/3] w-full overflow-hidden bg-muted">
                  <Image
                    src={fiction.coverImage?.trim() || DEFAULT_FICTION_COVER}
                    alt={fiction.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-2 right-2 px-2 py-1 rounded-full bg-green-500/80 text-white text-xs font-bold">
                    ✓
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="font-semibold text-foreground text-xs line-clamp-2">{fiction.title}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{fiction.year}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {activeTab === "fictions" && uploadedFictions.length === 0 && (
        <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
          No fictions added yet.
        </div>
      )}

      {/* Uploaded Locations */}
      {activeTab === "places" && uploadedLocations.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-cyan-400" />
            Places You Added
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {uploadedLocations.map((location) => (
              <div
                key={location.id}
                className="group rounded-lg border border-border bg-card/50 overflow-hidden hover:border-cyan-500/50 transition-all"
              >
                <div className="relative h-40 w-full overflow-hidden bg-muted">
                  <Image
                    src={location.image}
                    alt={location.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-2 right-2 px-2 py-1 rounded-full bg-green-500/80 text-white text-xs font-bold flex items-center gap-1">
                    ✓ Verified
                  </div>
                </div>
                <div className="p-3">
                  <p className="font-semibold text-foreground text-sm">{location.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{location.address}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {activeTab === "places" && uploadedLocations.length === 0 && (
        <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
          No places added yet.
        </div>
      )}

      {/* Contributed Photos */}
      {activeTab === "scenes" && contributedPhotos.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <Upload className="h-5 w-5 text-green-400" />
            Scenes You Shared
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {contributedPhotos.map((photo) => (
              <div
                key={photo.id}
                className="group rounded-lg border border-border bg-card/50 overflow-hidden hover:border-green-500/50 transition-all"
              >
                {photo.photoUrl && (
                  <div className="relative h-40 w-full overflow-hidden bg-muted">
                    <Image
                      src={photo.photoUrl}
                      alt="Contributed photo"
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                )}
                <div className="p-3">
                  {photo.caption && (
                    <p className="text-sm text-foreground line-clamp-2">{photo.caption}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    {new Date(photo.timestamp).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {activeTab === "scenes" && contributedPhotos.length === 0 && (
        <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
          No scenes added yet.
        </div>
      )}
    </div>
  )
}
