"use client"

import { useState } from "react"
import { ArrowLeft, Loader2 } from "lucide-react"
import { useTranslations } from "next-intl"
import type { Fiction } from "@/src/fictions/domain/fiction.entity"
import type { Place } from "@/src/places/domain/place.entity"
import { RELATION_KIND_OPTIONS } from "@/src/places/domain/place-relation-kind"
import type { PlaceRelationKind } from "@/src/places/domain/place-relation-kind"
import { SHOOT_ENVIRONMENT_OPTIONS } from "@/src/places/domain/place-shoot-environment"
import type { PlaceShootEnvironment } from "@/src/places/domain/place-shoot-environment"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FormField } from "./form-field"
import { clonePlaceToFictionAction } from "@/src/place-relationships/infrastructure/next/place-relationship.actions"

type PlaceCloneToFictionViewProps = {
  sourcePlace: Place
  fictions: Fiction[]
  onBack: () => void
  onSuccess: (places: Place[]) => void
}

export function PlaceCloneToFictionView({
  sourcePlace,
  fictions,
  onBack,
  onSuccess,
}: PlaceCloneToFictionViewProps) {
  const t = useTranslations("Admin")
  const tPlaces = useTranslations("Places")
  const sourceFiction = fictions.find((f) => f.id === sourcePlace.fictionId)
  const targetOptions = fictions.filter((f) => f.id !== sourcePlace.fictionId)

  const [targetFictionId, setTargetFictionId] = useState("")
  const [placeName, setPlaceName] = useState(sourcePlace.name)
  const [description, setDescription] = useState(sourcePlace.description)
  const [relationKind, setRelationKind] = useState<PlaceRelationKind>(
    sourcePlace.relationKind,
  )
  const [shootEnvironment, setShootEnvironment] = useState<string>(
    sourcePlace.shootEnvironment ?? "",
  )
  const [relationshipName, setRelationshipName] = useState(sourcePlace.name)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!targetFictionId) {
      setError(t("clonePlacePickFiction"))
      return
    }
    setSubmitting(true)
    const result = await clonePlaceToFictionAction({
      sourcePlaceId: sourcePlace.id,
      targetFictionId,
      placeName,
      description,
      relationKind,
      shootEnvironment: (shootEnvironment || null) as PlaceShootEnvironment | null,
      relationshipName: relationshipName.trim() || placeName,
    })
    setSubmitting(false)
    if (!result.success) {
      setError(result.error)
      return
    }
    onSuccess(result.places)
  }

  return (
    <div className="space-y-6 max-w-xl">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("backToLocations")}
      </button>

      <div>
        <h2 className="text-lg font-bold text-foreground">{t("clonePlaceTitle")}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {t("clonePlaceDescription", {
            place: sourcePlace.name,
            fiction: sourceFiction?.title ?? "—",
          })}
        </p>
        <p className="text-xs text-muted-foreground mt-2">{t("clonePlaceNoImageHint")}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label={t("clonePlaceTargetFiction")} required>
          <Select value={targetFictionId} onValueChange={setTargetFictionId}>
            <SelectTrigger>
              <SelectValue placeholder={t("clonePlacePickFiction")} />
            </SelectTrigger>
            <SelectContent>
              {targetOptions.map((fiction) => (
                <SelectItem key={fiction.id} value={fiction.id}>
                  {fiction.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        <FormField label={t("name")} required>
          <Input
            value={placeName}
            onChange={(e) => setPlaceName(e.target.value)}
            required
          />
        </FormField>

        <FormField label={t("description")} required>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            rows={4}
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
          />
        </FormField>

        <FormField label={tPlaces("fieldRelationKind")}>
          <Select
            value={relationKind}
            onValueChange={(v) => setRelationKind(v as PlaceRelationKind)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RELATION_KIND_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {tPlaces(opt.labelKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        <FormField label={tPlaces("fieldShootEnvironment")}>
          <Select
            value={shootEnvironment || "__none__"}
            onValueChange={(v) => setShootEnvironment(v === "__none__" ? "" : v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">—</SelectItem>
              {SHOOT_ENVIRONMENT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {tPlaces(opt.labelKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        <FormField label={t("clonePlaceSharedGroupName")}>
          <Input
            value={relationshipName}
            onChange={(e) => setRelationshipName(e.target.value)}
          />
          <p className="text-xs text-muted-foreground mt-1">
            {t("clonePlaceSharedGroupHint")}
          </p>
        </FormField>

        <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
          <p>
            <span className="font-medium text-foreground">{t("clonePlaceLocationLabel")}:</span>{" "}
            {sourcePlace.location.address || sourcePlace.location.name}
          </p>
          <p>
            {sourcePlace.location.lat.toFixed(5)}, {sourcePlace.location.lng.toFixed(5)}
          </p>
          <p>{t("clonePlaceLocationCloneHint")}</p>
        </div>

        {error ? <p className="text-sm text-red-500">{error}</p> : null}

        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onBack} disabled={submitting}>
            {t("cancel")}
          </Button>
          <Button type="submit" variant="cta" disabled={submitting || !targetOptions.length}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("clonePlaceSubmitting")}
              </>
            ) : (
              t("clonePlaceSubmit")
            )}
          </Button>
        </div>
        {!targetOptions.length ? (
          <p className="text-sm text-muted-foreground">{t("clonePlaceNoOtherFictions")}</p>
        ) : null}
      </form>
    </div>
  )
}
