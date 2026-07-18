"use client"

import { Check } from "lucide-react"
import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import type { HuntPlaceReviewed } from "@/src/hunts/domain/hunt.types"
import {
  effectivePlace,
  isAddressOverridden,
  isCoordsOverridden,
  isNameOverridden,
  isShootEnvironmentOverridden,
} from "@/src/hunts/domain/hunt-place.helpers"
import type { LatLng } from "@/lib/map/types"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { HuntReviewStatus } from "./hunt-places-aside"

const NOTE_TEXTAREA =
  "w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:opacity-60"

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
  reviewed: HuntPlaceReviewed
  coords: LatLng | null
  reviewStatus: HuntReviewStatus
  onToggleApprove: () => void
  reviewNote: string
  onReviewNoteChange?: (note: string) => void
  canEdit?: boolean
  postulateHref?: string | null
  className?: string
}

export function HuntReviewCriteriaAside({
  sourceUrl,
  reviewed,
  coords,
  reviewStatus,
  onToggleApprove,
  reviewNote,
  onReviewNoteChange,
  canEdit = true,
  postulateHref = null,
  className,
}: HuntReviewCriteriaAsideProps) {
  const t = useTranslations("Contribute.huntReview")
  const tPlaces = useTranslations("Places")
  const place = effectivePlace(reviewed)
  const extracted = reviewed.extracted
  const coordsAdjusted = isCoordsOverridden(reviewed)
  const addressAdjusted = isAddressOverridden(reviewed)
  const nameAdjusted = isNameOverridden(reviewed)
  const shootEnvironmentAdjusted = isShootEnvironmentOverridden(reviewed)
  const isApproved = reviewStatus === "approved"
  const isPosted = reviewStatus === "posted"
  const isSkipped = reviewStatus === "skipped"
  const isDuplicate = place.duplicate_of !== null

  const formattedLocation = [place.address, place.city, place.country].filter(Boolean).join(", ")
  const sourceLocation = [extracted.address, extracted.city, extracted.country]
    .filter(Boolean)
    .join(", ")
  const addressLabel = addressAdjusted ? "Address (edited)" : "Address"
  const nameLabel = nameAdjusted ? "Name (edited)" : "Name"
  const showSourceAddress = addressAdjusted && sourceLocation && sourceLocation !== formattedLocation
  const shootEnvironmentLabel = place.shoot_environment
    ? tPlaces(`shootEnvironment_${place.shoot_environment}`)
    : "—"

  return (
    <aside className={cn("flex h-full min-h-0 w-full min-w-0 flex-col", className)}>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain">
        <div className="space-y-3">
          <h2 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Summary</h2>
          {postulateHref && (
            <div className="space-y-1.5">
              <Button asChild size="sm" className="w-full">
                <Link href={postulateHref}>{t("postulateAction")}</Link>
              </Button>
              <p className="text-[10px] text-muted-foreground">{t("postulateHint")}</p>
            </div>
          )}
        </div>
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
        <MetaField label={nameLabel} value={place.name} />
        {nameAdjusted && extracted.name && extracted.name !== place.name && (
          <MetaField label="Source name" value={extracted.name} />
        )}
        <MetaField label={addressLabel} value={formattedLocation} />
        {showSourceAddress && (
          <MetaField label="Source address" value={sourceLocation} />
        )}
        <MetaField label="Confidence" value={extracted.confidence} />
        <MetaField label="Landmark" value={extracted.is_landmark ? "Yes" : "No"} />
        <MetaField
          label={shootEnvironmentAdjusted ? "Shoot environment (edited)" : tPlaces("fieldShootEnvironment")}
          value={shootEnvironmentLabel}
        />
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

        <div className="space-y-1.5 border-t border-border/40 pt-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            {t("placeNoteLabel")}
          </p>
          {canEdit && onReviewNoteChange ? (
            <>
              <textarea
                value={reviewNote}
                onChange={(e) => onReviewNoteChange(e.target.value)}
                placeholder={t("placeNotePlaceholder")}
                rows={3}
                maxLength={500}
                className={NOTE_TEXTAREA}
              />
              <p className="text-[10px] text-muted-foreground">{t("placeNoteHint")}</p>
            </>
          ) : reviewNote.trim() ? (
            <p className="text-xs leading-relaxed text-foreground">{reviewNote}</p>
          ) : (
            <p className="text-xs text-muted-foreground">—</p>
          )}
        </div>

        {canEdit && !isPosted && !isSkipped && (
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
              {t("approveAction")}
            </button>
          </div>
        )}

        {!canEdit && (isPosted || isSkipped) && (
          <div className="border-t border-border/40 pt-3">
            <p className="text-xs font-medium text-foreground">
              {isPosted ? t("statusPosted") : t("statusSkipped")}
            </p>
          </div>
        )}
      </div>
    </aside>
  )
}
