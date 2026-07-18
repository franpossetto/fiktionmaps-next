"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Pencil, RotateCcw } from "lucide-react"
import type { HuntPlace } from "@/src/hunts/domain/hunt.types"
import type { StreetViewReference } from "@/src/locations/domain/location-view-reference.schemas"
import type { LatLng } from "@/lib/map/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { HuntPlaceVerificationPanel, type HuntPlaceAddressFields } from "./hunt-place-verification-panel"
import { HuntDuplicateBanner } from "./hunt-duplicate-banner"
import { HuntPlaceSectionHeading } from "./hunt-place-section-heading"
import { SHOOT_ENVIRONMENT_OPTIONS } from "@/src/places/domain/place-shoot-environment"
import type { PlaceShootEnvironment } from "@/src/places/domain/place-shoot-environment"

export interface HuntPlaceReviewDetailProps {
  place: HuntPlace
  index: number
  totalPlaces: number
  coords: LatLng | null
  coordsAdjusted: boolean
  addressAdjusted: boolean
  nameAdjusted: boolean
  savedReference?: StreetViewReference | null
  onCoordsChange: (coords: LatLng, cameraReference?: StreetViewReference) => void
  onCoordsReset: () => void
  onAddressChange: (address: HuntPlaceAddressFields) => void
  onAddressReset: () => void
  onFullAddressChange: (data: { lat: number; lng: number; address: HuntPlaceAddressFields }) => void
  onReferenceChange?: (reference: StreetViewReference | null) => void
  onNameChange: (name: string) => void
  onNameReset: () => void
  shootEnvironment?: PlaceShootEnvironment | null
  shootEnvironmentAdjusted?: boolean
  onShootEnvironmentChange?: (value: PlaceShootEnvironment | null) => void
  onShootEnvironmentReset?: () => void
}

function formatPlaceAddress(place: HuntPlace): string {
  return [place.address, place.city, place.country].filter(Boolean).join(", ")
}

export function HuntPlaceReviewDetail({
  place,
  index,
  totalPlaces,
  coords,
  coordsAdjusted,
  addressAdjusted,
  nameAdjusted,
  savedReference,
  onCoordsChange,
  onCoordsReset,
  onAddressChange,
  onAddressReset,
  onFullAddressChange,
  onReferenceChange,
  onNameChange,
  onNameReset,
  shootEnvironment,
  shootEnvironmentAdjusted = false,
  onShootEnvironmentChange,
  onShootEnvironmentReset,
}: HuntPlaceReviewDetailProps) {
  const t = useTranslations("Contribute.huntReview")
  const tPlaces = useTranslations("Places")
  const isDuplicate = place.duplicate_of !== null
  const description = place.description.trim() || t("noDescription")
  const formattedAddress = formatPlaceAddress(place)
  const locationLine = [place.city, place.country].filter(Boolean).join(", ")
  const [nameOpen, setNameOpen] = useState(false)
  const [editName, setEditName] = useState(place.name)

  return (
    <article className="space-y-6 pb-6">
      <header className="space-y-5">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="secondary" className="text-xs">
            {t("locationProgress", { current: index + 1, total: totalPlaces })}
          </Badge>
          {locationLine ? <span>{locationLine}</span> : null}
        </div>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="w-full min-w-0 flex-1 text-balance text-3xl font-bold leading-[1.15] tracking-tight text-foreground sm:text-4xl xl:text-[2.65rem]">
            {place.name}
          </h1>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setEditName(place.name)
                setNameOpen(true)
              }}
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden />
              {t("editName")}
            </Button>
            {nameAdjusted && (
              <Button type="button" variant="outline" size="sm" onClick={onNameReset}>
                <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                {t("resetName")}
              </Button>
            )}
          </div>
        </div>

        {(isDuplicate || coordsAdjusted || addressAdjusted || nameAdjusted || shootEnvironmentAdjusted) && (
          <div className="flex flex-wrap gap-1.5">
            {isDuplicate && (
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                Possible duplicate
              </span>
            )}
            {nameAdjusted && (
              <span className="rounded-full bg-fuchsia-100 px-2.5 py-0.5 text-xs font-medium text-fuchsia-700 dark:bg-fuchsia-900/40 dark:text-fuchsia-400">
                Name edited
              </span>
            )}
            {coordsAdjusted && (
              <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-medium text-sky-700 dark:bg-sky-900/40 dark:text-sky-400">
                Pin adjusted
              </span>
            )}
            {addressAdjusted && (
              <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-medium text-violet-700 dark:bg-violet-900/40 dark:text-violet-400">
                Address edited
              </span>
            )}
            {shootEnvironmentAdjusted && (
              <span className="rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-medium text-teal-700 dark:bg-teal-900/40 dark:text-teal-400">
                Shoot environment edited
              </span>
            )}
          </div>
        )}

        {isDuplicate && (
          <HuntDuplicateBanner
            newPlace={{ name: place.name }}
            duplicateOf={place.duplicate_of!}
          />
        )}
      </header>

      {coords ? (
        <HuntPlaceVerificationPanel
          mapId={`hunt-verify-${index}`}
          latitude={coords.lat}
          longitude={coords.lng}
          placeName={place.name}
          description={description}
          formattedAddress={formattedAddress}
          addressFields={{
            address: place.address,
            city: place.city,
            country: place.country,
          }}
          coordsAdjusted={coordsAdjusted}
          addressAdjusted={addressAdjusted}
          savedReference={savedReference}
          onCoordsChange={onCoordsChange}
          onCoordsReset={onCoordsReset}
          onAddressChange={onAddressChange}
          onAddressReset={onAddressReset}
          onFullAddressChange={onFullAddressChange}
          onReferenceChange={onReferenceChange}
        />
      ) : (
        <div className="mt-6 space-y-5">
          <p className="rounded-xl border border-border/60 bg-muted/30 px-4 py-6 text-sm text-muted-foreground">
            {t("noCoords")}
          </p>
          <p className="max-w-[75ch] text-base leading-8 text-muted-foreground">{description}</p>
        </div>
      )}

      {onShootEnvironmentChange ? (
        <section
          className="space-y-4 border-t border-border/60 pt-8"
          aria-labelledby="hunt-place-metadata-heading"
        >
          <HuntPlaceSectionHeading id="hunt-place-metadata-heading" title={t("metadataHeading")} />
          <div className="rounded-xl border border-border/60 bg-muted/15 p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
              <div className="min-w-0 flex-1 space-y-1.5">
                <Label htmlFor="hunt-shoot-environment">{tPlaces("fieldShootEnvironment")}</Label>
                <Select
                  value={shootEnvironment ?? undefined}
                  onValueChange={(v) => onShootEnvironmentChange(v as PlaceShootEnvironment)}
                >
                  <SelectTrigger id="hunt-shoot-environment" className="h-10 w-full bg-background">
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    {SHOOT_ENVIRONMENT_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {tPlaces(opt.labelKey)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {shootEnvironmentAdjusted && onShootEnvironmentReset ? (
                <Button type="button" variant="outline" size="sm" onClick={onShootEnvironmentReset}>
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                  {t("resetShootEnvironment")}
                </Button>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      <Dialog open={nameOpen} onOpenChange={setNameOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("editNameModalTitle")}</DialogTitle>
            <DialogDescription>{t("editNameModalDescription")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-name">{t("editNameLabel")}</Label>
              <Input
                id="edit-name"
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" size="sm">
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="button"
              size="sm"
              disabled={!editName.trim()}
              onClick={() => {
                const trimmed = editName.trim()
                if (!trimmed) return
                onNameChange(trimmed)
                setNameOpen(false)
              }}
            >
              {t("editNameApply")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </article>
  )
}
