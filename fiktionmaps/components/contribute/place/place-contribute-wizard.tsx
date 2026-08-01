"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useTranslations } from "next-intl"
import { AnimatePresence, motion } from "framer-motion"
import { Loader2 } from "lucide-react"
import type { MapControlHandle } from "@/lib/map/types"
import type { City } from "@/src/cities/domain/city.entity"
import type { FictionWithMedia } from "@/src/fictions/domain/fiction.entity"
import { createContributorPlaceWithImageAction } from "@/src/places/infrastructure/next/place.actions"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FictionContributeLayout } from "@/components/contribute/fiction/fiction-contribute-layout"
import { ContributeFieldWrapper } from "@/components/contribute/contribute-field-wrapper"
import { ContributeStepHeader } from "@/components/contribute/contribute-step-header"
import { ContributionWizardShell } from "@/components/contribute/contribution-wizard-shell"
import { loadImageDimensionsFromFile } from "@/lib/images/load-image-dimensions-from-file"
import {
  isPlaceHeroAspectRatioOk,
  isPlaceHeroReadableResolutionOk,
  validatePlaceContributeImageFile,
} from "@/components/contribute/place/place-contribute-image-schema"
import { PlaceContributePhotoField } from "@/components/contribute/place/place-contribute-photo-field"
import {
  LOCATION_TYPE_OPTIONS,
  DEFAULT_MAPBOX_SEARCH_TYPES,
  PlaceAddressSearchWithFilters,
  PlaceLocationMap,
  flyMapToLocation,
  resolveCityId,
  type MapboxSearchType,
} from "@/components/places/place-location-picker"
import { PlaceContributeCriteriaAside } from "@/components/contribute/place/place-contribute-criteria-aside"
import { PlaceContributeReferencePhotoAside } from "@/components/contribute/place/place-contribute-reference-photo-aside"
import { PlaceContributeDoneView } from "@/components/contribute/place/place-contribute-done-view"
import { PlaceContributeFppRewardCompactStrip } from "@/components/contribute/place/place-contribute-fpp-reward-card"
import { PlaceContributePublicPreview } from "@/components/contribute/place/place-contribute-public-preview"
import { StreetViewReferencePicker } from "@/components/places/street-view-reference-picker"
import type { StreetViewReference } from "@/src/locations/domain/location-view-reference.schemas"
import { SHOOT_ENVIRONMENT_OPTIONS } from "@/src/places/domain/place-shoot-environment"
import type { PlaceShootEnvironment } from "@/src/places/domain/place-shoot-environment"
import type { HuntPlaceContributePrefill } from "@/src/hunts/domain/hunt-candidate.helpers"
import {
  PlaceContributeStepsAside,
  type PlaceContributeFormStep,
} from "@/components/contribute/place/place-contribute-steps-aside"
import { cn } from "@/lib/utils"

const INPUT_ROW =
  "h-11 w-full shrink-0 rounded-xl border border-border bg-card px-4 text-sm outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground focus:ring-2 focus:ring-foreground/20"
const INPUT_AREA =
  "min-h-[100px] w-full resize-y rounded-xl border border-border bg-card px-4 py-2.5 text-sm outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground focus:ring-2 focus:ring-foreground/20"

const TOTAL_STEPS = 8
const PLACE_MAP_ID = "contribute-place-map"

const stepVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
} as const

export interface PlaceContributeWizardProps {
  initialFictions: FictionWithMedia[]
  initialCities: City[]
  huntPrefill?: HuntPlaceContributePrefill | null
}

function emptyDraft(): Draft {
  return {
    fictionId: "",
    fictionSearch: "",
    address: "",
    formattedAddress: "",
    latitude: Number.NaN,
    longitude: Number.NaN,
    cityId: "",
    locationName: "",
    placeName: "",
    locationType: "",
    isLandmark: false,
    shootEnvironment: null,
    description: "",
    imageFile: null,
    streetViewReference: null,
    mapSuggestion: "",
  }
}

function draftFromHuntPrefill(prefill: HuntPlaceContributePrefill): Draft {
  return {
    fictionId: prefill.fictionId,
    fictionSearch: "",
    address: prefill.formattedAddress,
    formattedAddress: prefill.formattedAddress,
    latitude: prefill.latitude,
    longitude: prefill.longitude,
    cityId: prefill.cityId,
    locationName: prefill.locationName,
    placeName: prefill.placeName,
    locationType: "",
    isLandmark: prefill.isLandmark,
    shootEnvironment: prefill.shootEnvironment,
    description: prefill.description,
    imageFile: null,
    streetViewReference: prefill.streetViewReference,
    mapSuggestion: prefill.locationName,
  }
}

type Draft = {
  fictionId: string
  fictionSearch: string
  address: string
  formattedAddress: string
  latitude: number
  longitude: number
  cityId: string
  locationName: string
  placeName: string
  locationType: string
  isLandmark: boolean
  shootEnvironment: PlaceShootEnvironment | null
  description: string
  imageFile: File | null
  streetViewReference: StreetViewReference | null
  /** Mapbox label for input placeholders only (not auto-filled). */
  mapSuggestion: string
}

export function PlaceContributeWizard({
  initialFictions,
  initialCities,
  huntPrefill = null,
}: PlaceContributeWizardProps) {
  const t = useTranslations("Contribute.place")
  const tPlaces = useTranslations("Places")
  const tNav = useTranslations("Contribute.nav")
  const tVal = useTranslations("Contribute.validation")
  const tHunt = useTranslations("Contribute.huntReview")

  const [step, setStep] = useState<PlaceContributeFormStep>(huntPrefill ? 5 : 1)
  const [done, setDone] = useState<{
    variant: "pending" | "approved"
    placeId: string
    placeSlug: string
    fictionId: string
    fictionSlug: string
    citySlug: string
    cityHasPublicPlaces: boolean
    placeName: string
    imageUrl: string | null
  } | null>(null)

  const [draft, setDraft] = useState<Draft>(() =>
    huntPrefill ? draftFromHuntPrefill(huntPrefill) : emptyDraft(),
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [addressLocked, setAddressLocked] = useState(Boolean(huntPrefill))
  const [searchTypes, setSearchTypes] = useState<MapboxSearchType[]>(DEFAULT_MAPBOX_SEARCH_TYPES)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmCityId, setConfirmCityId] = useState("")
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [photoInspecting, setPhotoInspecting] = useState(false)
  const [photoImageDims, setPhotoImageDims] = useState<{ width: number; height: number } | null>(null)
  const [photoFocus, setPhotoFocus] = useState({ x: 50, y: 50 })
  const mapControlRef = useRef<MapControlHandle | null>(null)

  useEffect(() => {
    if (draft.imageFile) {
      const url = URL.createObjectURL(draft.imageFile)
      setPreviewUrl(url)
      return () => URL.revokeObjectURL(url)
    }
    setPreviewUrl(null)
  }, [draft.imageFile])

  const filteredFictions = useMemo(() => {
    const q = draft.fictionSearch.trim().toLowerCase()
    if (!q) return initialFictions
    return initialFictions.filter((f) => f.title.toLowerCase().includes(q))
  }, [draft.fictionSearch, initialFictions])

  const selectedFiction = useMemo(
    () => initialFictions.find((f) => f.id === draft.fictionId) ?? null,
    [draft.fictionId, initialFictions],
  )

  const imagePreviewForDone = previewUrl

  const handlePhotoFile = useCallback(
    async (file: File) => {
      setPhotoInspecting(true)
      setSubmitError(null)
      setErrors((prev) => {
        const next = { ...prev }
        delete next.image
        return next
      })
      const formatErr = validatePlaceContributeImageFile(file, {
        imageFormatInvalid: tVal("imageFormatInvalid"),
        imageTooLarge: tVal("imageTooLarge"),
      })
      if (formatErr) {
        setDraft((p) => ({ ...p, imageFile: null }))
        setPhotoImageDims(null)
        setErrors((prev) => ({ ...prev, image: formatErr }))
        setPhotoInspecting(false)
        return
      }
      try {
        const dims = await loadImageDimensionsFromFile(file)
        setDraft((p) => ({ ...p, imageFile: file }))
        setPhotoImageDims(dims)
        if (!isPlaceHeroAspectRatioOk(dims.width, dims.height)) {
          setErrors((prev) => ({ ...prev, image: tVal("placePhotoAspectInvalid") }))
        } else if (!isPlaceHeroReadableResolutionOk(dims.width, dims.height)) {
          setErrors((prev) => ({ ...prev, image: tVal("imageResolutionLow") }))
        }
      } catch {
        setDraft((p) => ({ ...p, imageFile: null }))
        setPhotoImageDims(null)
        setErrors((prev) => ({ ...prev, image: tVal("placePhotoImageLoadFailed") }))
      } finally {
        setPhotoInspecting(false)
      }
    },
    [tVal],
  )

  const clearPhoto = useCallback(() => {
    setDraft((p) => ({ ...p, imageFile: null }))
    setPhotoImageDims(null)
    setPhotoFocus({ x: 50, y: 50 })
    setErrors((prev) => {
      const next = { ...prev }
      delete next.image
      return next
    })
  }, [])

  const validateStep = useCallback(
    (s: PlaceContributeFormStep): boolean => {
      const next: Record<string, string> = {}
      if (s === 1 && !draft.fictionId) next.fictionId = t("fictionRequired")
      if (s === 2 && !addressLocked) next.address = t("addressRequired")
      if (s === 5) {
        if (!draft.imageFile) {
          next.image = t("photoRequired")
        } else if (!photoImageDims || !isPlaceHeroAspectRatioOk(photoImageDims.width, photoImageDims.height)) {
          next.image = tVal("placePhotoAspectInvalid")
        } else if (!isPlaceHeroReadableResolutionOk(photoImageDims.width, photoImageDims.height)) {
          next.image = tVal("imageResolutionLow")
        }
      }
      if (s === 7 && !draft.description.trim()) next.description = t("descriptionRequired")
      setErrors(next)
      return Object.keys(next).length === 0
    },
    [addressLocked, draft, photoImageDims, t, tVal],
  )

  const handleAddressSelect = useCallback(
    (result: {
      lat: number
      lng: number
      place_name: string
      text: string
      context?: Array<{ id: string; text: string }>
    }) => {
      const cityId = resolveCityId(result.context, result.place_name, initialCities)
      const suggested = result.text || result.place_name.split(",")[0]?.trim() || ""
      setDraft((prev) => ({
        ...prev,
        latitude: result.lat,
        longitude: result.lng,
        formattedAddress: result.place_name,
        address: result.place_name,
        cityId,
        mapSuggestion: suggested,
      }))
      setAddressLocked(true)
      flyMapToLocation(mapControlRef.current, result.lat, result.lng)
    },
    [initialCities],
  )

  const handleNext = useCallback(() => {
    setSubmitError(null)
    if (!validateStep(step)) return
    if (step < TOTAL_STEPS) setStep((s) => (s + 1) as PlaceContributeFormStep)
  }, [step, validateStep])

  const handleBack = useCallback(() => {
    setSubmitError(null)
    if (step > 1) setStep((s) => (s - 1) as PlaceContributeFormStep)
  }, [step])

  const submitPlace = useCallback(
    async (cityId: string) => {
      setSubmitting(true)
      setSubmitError(null)
      const fd = new FormData()
      fd.set("fictionId", draft.fictionId)
      fd.set("cityId", cityId)
      fd.set("locationName", draft.locationName.trim())
      fd.set("placeName", draft.placeName.trim())
      fd.set("formattedAddress", draft.formattedAddress.trim())
      fd.set("latitude", String(draft.latitude))
      fd.set("longitude", String(draft.longitude))
      fd.set("description", draft.description.trim())
      fd.set("isLandmark", String(draft.isLandmark))
      fd.set("locationType", draft.locationType)
      if (draft.shootEnvironment) fd.set("shootEnvironment", draft.shootEnvironment)
      if (draft.imageFile) {
        fd.set("imageFile", draft.imageFile)
        fd.set("focusX", String(photoFocus.x))
        fd.set("focusY", String(photoFocus.y))
      }
      if (draft.streetViewReference) {
        fd.set("streetViewReference", JSON.stringify(draft.streetViewReference))
      }
      if (huntPrefill) {
        fd.set("huntId", huntPrefill.huntId)
        fd.set("placeIndex", String(huntPrefill.placeIndex))
      }

      const res = await createContributorPlaceWithImageAction(fd)
      setSubmitting(false)
      if (!res.success) {
        setSubmitError(res.error)
        return
      }
      setDone({
        variant: res.contributionAutoApproved ? "approved" : "pending",
        placeId: res.placeId,
        placeSlug: res.placeSlug,
        fictionId: res.fictionId,
        fictionSlug: res.fictionSlug,
        citySlug: res.citySlug,
        cityHasPublicPlaces: res.cityHasPublicPlaces,
        placeName: draft.placeName.trim(),
        imageUrl: imagePreviewForDone,
      })
      setConfirmOpen(false)
    },
    [draft, huntPrefill, imagePreviewForDone, selectedFiction],
  )

  const handleSubmitClick = useCallback(() => {
    if (!draft.placeName.trim()) {
      setErrors({ placeName: t("placeNameRequired") })
      setStep(4)
      return
    }
    if (!validateStep(8)) return
    for (let s = 1; s <= 7; s++) {
      if (!validateStep(s as PlaceContributeFormStep)) {
        setStep(s as PlaceContributeFormStep)
        return
      }
    }
    setConfirmCityId(draft.cityId || initialCities[0]?.id || "")
    setConfirmOpen(true)
  }, [draft.cityId, initialCities, validateStep])

  if (done) {
    const huntReturnHref = huntPrefill ? `/contribute/hunt/${huntPrefill.huntId}/review` : null
    const returnLabel = huntPrefill ? tHunt("postulateBackToHunt") : t("backToMap")

    let returnHref: string | null = huntReturnHref
    let returnDisabled = false
    if (!huntPrefill) {
      const citySlug = done.citySlug.trim()
      if (done.variant === "approved") {
        // Live place: open map on that city filtered to the fiction.
        returnHref = citySlug
          ? `/map?city=${encodeURIComponent(citySlug)}&fiction=${encodeURIComponent(done.fictionId)}`
          : `/map?fiction=${encodeURIComponent(done.fictionId)}`
      } else if (citySlug && done.cityHasPublicPlaces) {
        // Pending place, but city already exists on the public map.
        returnHref = `/map?city=${encodeURIComponent(citySlug)}`
      } else {
        // Pending and city not yet on the map (no approved places).
        returnHref = null
        returnDisabled = true
      }
    }

    return (
      <FictionContributeLayout leftAside={null} rightAside={null} mainColumnScroll>
        <div className="flex min-h-full items-center justify-center px-4 py-10">
          <PlaceContributeDoneView
            variant={done.variant}
            placeName={done.placeName}
            imageSrc={done.imageUrl}
            placeHref={`/fictions/${done.fictionSlug}/places/${done.placeSlug}`}
            returnHref={returnHref}
            returnLabel={returnLabel}
            returnDisabled={returnDisabled}
          />
        </div>
      </FictionContributeLayout>
    )
  }

  const leftAside = (
    <PlaceContributeStepsAside step={step} onNavigate={(s) => setStep(s)} className="min-[900px]:pl-1" />
  )
  const rightAside = (
    <PlaceContributeCriteriaAside step={step} photoPreviewUrl={step === 6 ? previewUrl : undefined} />
  )

  const mapPlaceholder = draft.mapSuggestion.trim()
    ? t("placeholderFromMap", { suggestion: draft.mapSuggestion.trim() })
    : undefined

  const stepTitle = (() => {
    switch (step) {
      case 1:
        return t("fictionTitle")
      case 2:
        return t("locationTitle")
      case 3:
        return t("locationGeoTitle")
      case 4:
        return t("placeFictionTitle")
      case 5:
        return t("photoTitle")
      case 6:
        return t("streetViewTitle")
      case 7:
        return t("descriptionTitle")
      case 8:
        return t("previewTitle")
    }
  })()

  const stepLead = (() => {
    switch (step) {
      case 1:
        return t("fictionDescription")
      case 2:
        return t("locationDescription")
      case 3:
        return t("locationGeoDescription")
      case 4:
        return t("placeFictionDescription")
      case 5:
        return t("photoDescription")
      case 6:
        return t("streetViewDescription")
      case 7:
        return t("descriptionDescription")
      case 8:
        return t("previewDescription")
    }
  })()

  return (
    <FictionContributeLayout leftAside={leftAside} rightAside={rightAside} mainColumnScroll={false}>
      <ContributionWizardShell
        stepIndex={step - 1}
        totalSteps={TOTAL_STEPS}
        contentMaxWidthClassName={
          step === 2 ? "max-w-4xl" : step === 6 ? "max-w-4xl" : step === 8 ? "max-w-[min(100%,1900px)]" : "max-w-md"
        }
        footerNav={{
          showBack: step > 1,
          onBack: handleBack,
          isLastStep: step === TOTAL_STEPS,
          onNext: handleNext,
          onSubmit: handleSubmitClick,
          submitLabel: step === TOTAL_STEPS ? t("previewSubmit") : undefined,
          backLabel: step === TOTAL_STEPS ? t("previewBack") : undefined,
          disabled: submitting,
          loading: submitting,
          showTrailingArrow: step < TOTAL_STEPS,
        }}
      >
        {step !== 8 ? (
          <div className="min-[900px]:hidden">
            <PlaceContributeFppRewardCompactStrip className="mb-4" />
          </div>
        ) : null}

        {huntPrefill && (
          <div className="mb-4 rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
            <p className="text-sm font-medium text-foreground">{tHunt("inboxBannerTitle")}</p>
            <p className="mt-1 text-xs text-muted-foreground">{tHunt("postulateHint")}</p>
          </div>
        )}

        {step !== 8 ? (
          <ContributeStepHeader
            title={stepTitle}
            description={stepLead}
            badge={step === 6 ? "enrichment" : "required"}
            stepNumber={step}
            totalSteps={TOTAL_STEPS}
            variant="minimal"
          />
        ) : null}

        <AnimatePresence mode="wait">
          <motion.div key={step} variants={stepVariants} initial="initial" animate="animate" exit="exit">
            {step === 1 ? (
              <div className="space-y-4">
                <input
                  type="search"
                  value={draft.fictionSearch}
                  onChange={(e) => setDraft((p) => ({ ...p, fictionSearch: e.target.value }))}
                  placeholder={t("fictionSearchPlaceholder")}
                  className={INPUT_ROW}
                />
                <ContributeFieldWrapper label={t("stepFiction")} required error={errors.fictionId}>
                  <div className="max-h-64 space-y-1 overflow-y-auto rounded-xl border border-border p-1">
                    {filteredFictions.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setDraft((p) => ({ ...p, fictionId: f.id }))}
                        className={cn(
                          "w-full rounded-lg px-3 py-2 text-left text-sm transition-colors",
                          draft.fictionId === f.id ? "bg-primary/10 font-medium text-foreground" : "hover:bg-muted/60",
                        )}
                      >
                        {f.title}
                      </button>
                    ))}
                  </div>
                </ContributeFieldWrapper>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="space-y-4">
                <ContributeFieldWrapper label={t("stepLocation")} required error={errors.address}>
                  {addressLocked ? (
                    <div className="flex min-w-0 items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={draft.formattedAddress || draft.address}
                        className={cn(
                          INPUT_ROW,
                          "min-w-0 w-auto shrink flex-1 truncate cursor-not-allowed bg-muted/50",
                        )}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="shrink-0"
                        onClick={() => {
                          setAddressLocked(false)
                          setDraft((p) => ({
                            ...p,
                            address: "",
                            formattedAddress: "",
                            latitude: Number.NaN,
                            longitude: Number.NaN,
                            cityId: "",
                          }))
                        }}
                      >
                        {t("addressLockedChange")}
                      </Button>
                    </div>
                  ) : (
                    <PlaceAddressSearchWithFilters
                      value={draft.address}
                      onChange={(v) => setDraft((p) => ({ ...p, address: v }))}
                      onSelect={handleAddressSelect}
                      searchTypes={searchTypes}
                      onSearchTypesChange={setSearchTypes}
                      placeholder={t("addressSearchPlaceholder")}
                      intersectionHint={t("addressIntersectionHint")}
                      filterLabel={t("addressSearchTypeFilter")}
                      typeLabels={{
                        poi: t("addressSearchTypePoi"),
                        address: t("addressSearchTypeAddress"),
                        street: t("addressSearchTypeStreet"),
                      }}
                    />
                  )}
                </ContributeFieldWrapper>
                <div className="relative h-[280px] overflow-hidden rounded-xl border border-border sm:h-[320px]">
                  <PlaceLocationMap
                    mapId={PLACE_MAP_ID}
                    mapKey="contribute-place-map"
                    latitude={draft.latitude}
                    longitude={draft.longitude}
                    placeName={draft.placeName}
                    previewUrl={previewUrl}
                    onMapReady={(ctrl) => {
                      mapControlRef.current = ctrl
                    }}
                  />
                </div>
              </div>
            ) : null}

            {step === 3 ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">{t("fieldLocationNameHint")}</p>
                <ContributeFieldWrapper label={t("fieldLocationName")} error={errors.locationName}>
                  <input
                    className={INPUT_ROW}
                    value={draft.locationName}
                    placeholder={mapPlaceholder}
                    onChange={(e) => setDraft((p) => ({ ...p, locationName: e.target.value }))}
                  />
                </ContributeFieldWrapper>
                <ContributeFieldWrapper label={t("fieldLocationType")}>
                  <Select
                    value={draft.locationType || undefined}
                    onValueChange={(v) => setDraft((p) => ({ ...p, locationType: v }))}
                  >
                    <SelectTrigger className={INPUT_ROW}>
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                    <SelectContent>
                      {LOCATION_TYPE_OPTIONS.filter((o) => o.value).map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </ContributeFieldWrapper>
                <ContributeFieldWrapper label={tPlaces("fieldShootEnvironment")}>
                  <Select
                    value={draft.shootEnvironment ?? undefined}
                    onValueChange={(v) =>
                      setDraft((p) => ({
                        ...p,
                        shootEnvironment: v as PlaceShootEnvironment,
                      }))
                    }
                  >
                    <SelectTrigger className={INPUT_ROW}>
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                    <SelectContent>
                      {SHOOT_ENVIRONMENT_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {tPlaces(o.labelKey)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </ContributeFieldWrapper>
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={draft.isLandmark}
                    onChange={(e) => setDraft((p) => ({ ...p, isLandmark: e.target.checked }))}
                    className="h-4 w-4 rounded border-border"
                  />
                  {t("isLandmark")}
                </label>
              </div>
            ) : null}

            {step === 4 ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">{t("fieldPlaceNameHint")}</p>
                <ContributeFieldWrapper label={t("fieldPlaceName")} error={errors.placeName}>
                  <input
                    className={INPUT_ROW}
                    value={draft.placeName}
                    placeholder={mapPlaceholder}
                    onChange={(e) => setDraft((p) => ({ ...p, placeName: e.target.value }))}
                  />
                </ContributeFieldWrapper>
              </div>
            ) : null}

            {step === 5 ? (
              <div className="w-full space-y-3">
                <ContributeFieldWrapper label={t("photoTitle")} required error={errors.image}>
                  <PlaceContributePhotoField
                    previewUrl={previewUrl}
                    inspecting={photoInspecting}
                    onPickFile={(file) => void handlePhotoFile(file)}
                    onClear={clearPhoto}
                    focus={photoFocus}
                    onFocusChange={setPhotoFocus}
                  />
                </ContributeFieldWrapper>
                <p className="text-center text-xs text-muted-foreground sm:text-sm">{t("photoAspectHint")}</p>
              </div>
            ) : null}

            {step === 6 ? (
              <div className="w-full space-y-4">
                <div className="min-[900px]:hidden">
                  <PlaceContributeReferencePhotoAside previewUrl={previewUrl} />
                </div>
                <StreetViewReferencePicker
                  placeLatitude={draft.latitude}
                  placeLongitude={draft.longitude}
                  value={draft.streetViewReference}
                  onChange={(streetViewReference) => setDraft((p) => ({ ...p, streetViewReference }))}
                />
              </div>
            ) : null}

            {step === 7 ? (
              <ContributeFieldWrapper label={t("descriptionTitle")} required error={errors.description}>
                <textarea
                  className={INPUT_AREA}
                  value={draft.description}
                  onChange={(e) => setDraft((p) => ({ ...p, description: e.target.value }))}
                  rows={5}
                />
              </ContributeFieldWrapper>
            ) : null}

            {step === 8 && selectedFiction ? (
              <div className="w-full space-y-3">
                {submitError ? (
                  <p className="text-center text-xs text-destructive">{submitError}</p>
                ) : null}

                <PlaceContributeFppRewardCompactStrip className="min-[900px]:hidden" />

                <PlaceContributePublicPreview
                  fiction={selectedFiction}
                  cities={initialCities}
                  placeName={draft.placeName}
                  locationName={draft.locationName}
                  description={draft.description}
                  address={draft.address}
                  formattedAddress={draft.formattedAddress}
                  latitude={draft.latitude}
                  longitude={draft.longitude}
                  cityId={draft.cityId}
                  locationType={draft.locationType}
                  isLandmark={draft.isLandmark}
                  shootEnvironment={draft.shootEnvironment}
                  imagePreviewUrl={previewUrl}
                />
              </div>
            ) : null}

            {submitError && step !== 8 ? (
              <p className="mt-4 text-sm text-destructive">{submitError}</p>
            ) : null}
          </motion.div>
        </AnimatePresence>
      </ContributionWizardShell>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("confirmCityTitle")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{t("confirmCityBody")}</p>
          <div className="space-y-2">
            <label className="block text-sm font-medium">{t("confirmCityLabel")}</label>
            <Select value={confirmCityId || undefined} onValueChange={setConfirmCityId}>
              <SelectTrigger className="h-10 w-full">
                <SelectValue placeholder={t("confirmCityLabel")} />
              </SelectTrigger>
              <SelectContent className="z-[10000]">
                {initialCities.map((city) => (
                  <SelectItem key={city.id} value={city.id}>
                    {city.name}, {city.country}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmOpen(false)}>
              {tNav("back")}
            </Button>
            <Button
              type="button"
              variant="default"
              disabled={!confirmCityId.trim() || submitting}
              onClick={() => submitPlace(confirmCityId)}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {tNav("sending")}
                </>
              ) : (
                t("confirmCitySubmit")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </FictionContributeLayout>
  )
}
