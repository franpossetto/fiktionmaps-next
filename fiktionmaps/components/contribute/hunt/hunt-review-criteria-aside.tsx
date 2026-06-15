"use client"

import { Check } from "lucide-react"
import type { HuntPlace } from "@/src/hunts/domain/hunt.types"
import type { LatLng } from "@/lib/map/types"
import { cn } from "@/lib/utils"

function MetaField({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className={cn("text-xs sm:text-sm text-foreground break-words leading-relaxed", mono && "font-mono text-[11px]")}>
        {value || "—"}
      </p>
    </div>
  )
}

export interface HuntReviewCriteriaAsideProps {
  sourceUrl: string
  place: HuntPlace
  coords: LatLng | null
  coordsAdjusted: boolean
  reviewStatus: "pending" | "approved"
  onToggleApprove: () => void
  className?: string
}

export function HuntReviewCriteriaAside({
  sourceUrl,
  place,
  coords,
  coordsAdjusted,
  reviewStatus,
  onToggleApprove,
  className,
}: HuntReviewCriteriaAsideProps) {
  const isApproved = reviewStatus === "approved"
  const isDuplicate = place.duplicate_of !== null

  const addressLabel =
    place.address_source === "geocoded"
      ? "Address (geocoded)"
      : place.address_source === "page"
        ? "Address (from page)"
        : "Address"

  const formattedLocation = [place.address, place.city, place.country].filter(Boolean).join(", ")

  return (
    <aside className={cn("flex h-full min-h-0 w-full min-w-0 flex-col", className)}>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain">
        <h2 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Summary</h2>
        <div className="space-y-3">
        <div className="space-y-0.5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Page URL</p>
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block break-all text-xs sm:text-sm text-primary underline-offset-2 hover:underline"
          >
            {sourceUrl}
          </a>
        </div>
        <MetaField label="Name" value={place.name} />
        <MetaField label={addressLabel} value={formattedLocation} />
        <MetaField label="Confidence" value={place.confidence} />
        <MetaField label="Landmark" value={place.is_landmark ? "Yes" : "No"} />
        <MetaField
          label="Coordinates"
          value={coords != null ? `${coords.lat}, ${coords.lng}` : "—"}
          mono
        />
        {coordsAdjusted && <MetaField label="Pin" value="Adjusted manually" />}
        {isDuplicate && (
          <MetaField label="Duplicate of" value={place.duplicate_of!.name} mono />
        )}
        </div>

        <div className="border-t border-border/40 pt-3">
          <button
            type="button"
            onClick={onToggleApprove}
            aria-pressed={isApproved}
            className={cn(
              "inline-flex items-center gap-1.5 text-xs sm:text-sm transition-colors",
              isApproved
                ? "font-medium text-emerald-600 dark:text-emerald-400"
                : "text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400",
            )}
          >
            <span
              className={cn(
                "flex h-4 w-4 items-center justify-center rounded-sm border-2 transition-colors",
                isApproved
                  ? "border-emerald-600 bg-emerald-600 text-white dark:border-emerald-500 dark:bg-emerald-500"
                  : "border-border bg-background",
              )}
              aria-hidden
            >
              {isApproved ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : null}
            </span>
            Approve
          </button>
        </div>
      </div>
    </aside>
  )
}
