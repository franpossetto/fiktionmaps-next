"use client"

import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type ComponentType } from "react"
import Image from "next/image"
import {
  Check,
  Copy,
  FileText,
  Filter,
  GripVertical,
  MapPin,
  Plus,
  Rocket,
  Route,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import type { City } from "@/lib/modules/cities"
import type { Fiction } from "@/lib/modules/fictions"
import type { Place, TourDraft, TourStopWithPlace } from "@/lib/modules/tours"
import { useApi } from "@/lib/api"
import { useAuth } from "@/context/auth-context"
import { ToursMap } from "@/components/tours/tours-map"

type WizardStep = "details" | "scope" | "places" | "route" | "review"

const STEP_SEQUENCE: WizardStep[] = ["details", "scope", "places", "route", "review"]
const STEP_META: Record<
  WizardStep,
  {
    title: string
    subtitle: string
    label: string
    icon: ComponentType<{ className?: string }>
  }
> = {
  details: {
    title: "Step 1: Tour Details",
    subtitle: "Give your tour a title, banner, and description.",
    label: "Details",
    icon: FileText,
  },
  scope: {
    title: "Step 2: Scope",
    subtitle: "Choose city and fictions.",
    label: "Scope",
    icon: Filter,
  },
  places: {
    title: "Step 3: Places",
    subtitle: "Pick places to include in your route.",
    label: "Places",
    icon: MapPin,
  },
  route: {
    title: "Step 4: Route & Notes",
    subtitle: "Review suggested order and add notes for each stop.",
    label: "Route",
    icon: Route,
  },
  review: {
    title: "Step 5: Review & Create",
    subtitle: "Confirm details and create your tour.",
    label: "Create",
    icon: Rocket,
  },
}

function areStopOrdersEqual(left: TourDraft["stops"], right: TourDraft["stops"]): boolean {
  if (left.length !== right.length) return false
  return left.every((stop, index) => stop.id === right[index]?.id)
}

export function ToursWorkbenchStudio() {
  const { user } = useAuth()
  const { cities: cityService, fictions: fictionService, tours } = useApi()
  const [allCities, setAllCities] = useState<City[]>([])
  const [allFictions, setAllFictions] = useState<Fiction[]>([])
  const [allPlaces, setAllPlaces] = useState<Place[]>([])
  const [step, setStep] = useState<WizardStep>("details")
  const [selectedCityId, setSelectedCityId] = useState<string>("")
  const [selectedFictionIds, setSelectedFictionIds] = useState<string[]>([])
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null)
  const [activeStopIndex, setActiveStopIndex] = useState(0)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [lastSavedSlug, setLastSavedSlug] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [isCityPickerOpen, setIsCityPickerOpen] = useState(false)
  const [isFictionPickerOpen, setIsFictionPickerOpen] = useState(false)
  const [draft, setDraft] = useState<TourDraft | null>(null)
  const [resolvedStops, setResolvedStops] = useState<TourStopWithPlace[]>([])

  useEffect(() => {
    Promise.all([cityService.getAll(), fictionService.getAll(), tours.buildPlaces()]).then(
      ([c, f, p]) => {
        setAllCities(c)
        setAllFictions(f)
        setAllPlaces(p)
        const defaultCityId = c[0]?.id ?? ""
        setSelectedCityId(defaultCityId)
        const cityPlaces = p.filter((place) => place.cityId === defaultCityId)
        const fictionIds = Array.from(new Set(cityPlaces.flatMap((place) => place.fictionIds)))
        setSelectedFictionIds(fictionIds)
        setDraft(tours.createDraft("singleCity", defaultCityId || null))
      },
    )
  }, [cityService, fictionService, tours])

  const getCityFictionIds = useCallback(
    (cityId: string): string[] => {
      const cityPlaces = allPlaces.filter((place) => place.cityId === cityId)
      return Array.from(new Set(cityPlaces.flatMap((place) => place.fictionIds)))
    },
    [allPlaces],
  )

  const placeById = useMemo(() => new Map(allPlaces.map((p) => [p.id, p])), [allPlaces])
  const cityNameById = useMemo(() => new Map(allCities.map((city) => [city.id, city.name])), [allCities])
  const fictionNameById = useMemo(() => new Map(allFictions.map((fiction) => [fiction.id, fiction.title])), [allFictions])

  const currentStepIndex = STEP_SEQUENCE.indexOf(step)
  const previousStep = currentStepIndex > 0 ? STEP_SEQUENCE[currentStepIndex - 1] : null
  const nextStep =
    currentStepIndex < STEP_SEQUENCE.length - 1 ? STEP_SEQUENCE[currentStepIndex + 1] : null
  const progressPercent = ((currentStepIndex + 1) / STEP_SEQUENCE.length) * 100

  const availableFictions = useMemo(() => {
    const fictionIds = new Set(getCityFictionIds(selectedCityId))
    return allFictions.filter((fiction) => fictionIds.has(fiction.id))
  }, [selectedCityId, getCityFictionIds, allFictions])

  const selectedCityName = useMemo(
    () => cityNameById.get(selectedCityId) ?? selectedCityId,
    [cityNameById, selectedCityId],
  )

  const selectedFictionsSummary = useMemo(() => {
    if (selectedFictionIds.length === 0) return "No fictions selected"
    const names = selectedFictionIds.map((fictionId) => fictionNameById.get(fictionId) ?? fictionId)
    if (names.length <= 2) return names.join(", ")
    return `${names[0]}, ${names[1]} +${names.length - 2}`
  }, [fictionNameById, selectedFictionIds])

  const selectedFictionNames = useMemo(
    () => selectedFictionIds.map((fictionId) => fictionNameById.get(fictionId) ?? fictionId),
    [fictionNameById, selectedFictionIds],
  )

  const [filteredPlaces, setFilteredPlaces] = useState<Place[]>([])

  useEffect(() => {
    if (allPlaces.length === 0) return
    tours.filterPlaces(allPlaces, {
      cityIds: selectedCityId ? [selectedCityId] : [],
      fictionIds: selectedFictionIds.length > 0 ? selectedFictionIds : ["__none__"],
    }).then(setFilteredPlaces)
  }, [tours, allPlaces, selectedCityId, selectedFictionIds])

  useEffect(() => {
    if (!draft) return
    tours.resolveDraftStops(draft.stops).then(setResolvedStops)
  }, [tours, draft?.stops])
  const selectedPlace = useMemo(
    () => filteredPlaces.find((place) => place.id === selectedPlaceId) ?? null,
    [filteredPlaces, selectedPlaceId],
  )

  const bannerPreview =
    draft?.coverImage.trim() || resolvedStops[0]?.place.coverImage || selectedPlace?.coverImage || "/logo-icon.png"

  const isDetailsReady = (draft?.title.trim().length ?? 0) > 0
  const isScopeReady = Boolean(selectedCityId) && selectedFictionIds.length > 0
  const isPlacesReady = resolvedStops.length > 0

  useEffect(() => {
    if (!selectedPlaceId) return
    if (!filteredPlaces.some((place) => place.id === selectedPlaceId)) setSelectedPlaceId(null)
  }, [filteredPlaces, selectedPlaceId])

  useEffect(() => {
    setSelectedFictionIds((current) => {
      const filtered = current.filter((fictionId) =>
        availableFictions.some((fiction) => fiction.id === fictionId),
      )
      return filtered.length > 0 ? filtered : availableFictions.map((fiction) => fiction.id)
    })
  }, [availableFictions])

  useEffect(() => {
    setDraft((current) => {
      if (!current) return current
      const filteredStops = current.stops.filter((stop) => {
        const place = placeById.get(stop.placeId)
        if (!place) return false
        if (selectedCityId && place.cityId !== selectedCityId) return false
        if (selectedFictionIds.length === 0) return false
        return place.fictionIds.some((fictionId) => selectedFictionIds.includes(fictionId))
      })

      if (filteredStops.length === current.stops.length) return current
      return {
        ...current,
        stops: filteredStops.map((stop, index) => ({ ...stop, orderIndex: index })),
      }
    })
  }, [selectedCityId, selectedFictionIds, placeById])

  useEffect(() => {
    if (resolvedStops.length === 0) {
      setActiveStopIndex(0)
      if (step === "route" || step === "review") setStep("places")
      return
    }
    setActiveStopIndex((prev) => Math.max(0, Math.min(prev, resolvedStops.length - 1)))
  }, [resolvedStops.length, step])

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(null), 2600)
    return () => window.clearTimeout(timer)
  }, [notice])

  useEffect(() => {
    setDraft((current) => {
      if (!current) return current
      if (current.mode === "singleCity" && current.cityId === selectedCityId) return current
      return {
        ...current,
        mode: "singleCity",
        cityId: selectedCityId || null,
      }
    })
  }, [selectedCityId])

  const shareUrl = useMemo(() => {
    if (!lastSavedSlug) return null
    if (typeof window === "undefined") return `/tours/${lastSavedSlug}`
    return `${window.location.origin}/tours/${lastSavedSlug}`
  }, [lastSavedSlug])

  const canProceedFromStep = useCallback(
    (candidate: WizardStep): boolean => {
      if (candidate === "details") return isDetailsReady
      if (candidate === "scope") return isScopeReady
      if (candidate === "places") return isPlacesReady
      if (candidate === "route") return isPlacesReady
      return true
    },
    [isDetailsReady, isScopeReady, isPlacesReady],
  )

  const getStepBlockerMessage = useCallback((candidate: WizardStep): string => {
    if (candidate === "details") return "Add a title to continue."
    if (candidate === "scope") return "Select a city and at least one fiction."
    if (candidate === "places") return "Select at least one place to continue."
    if (candidate === "route") return "Add at least one stop before review."
    return "Complete required fields to continue."
  }, [])

  const handleNextStep = useCallback(() => {
    if (!nextStep) return
    if (!canProceedFromStep(step)) {
      setNotice(getStepBlockerMessage(step))
      return
    }
    setStep(nextStep)
  }, [canProceedFromStep, getStepBlockerMessage, nextStep, step])

  const handlePreviousStep = useCallback(() => {
    if (!previousStep) return
    setStep(previousStep)
  }, [previousStep])

  const handleToggleFiction = useCallback((fictionId: string) => {
    setSelectedFictionIds((current) =>
      current.includes(fictionId)
        ? current.filter((value) => value !== fictionId)
        : [...current, fictionId],
    )
  }, [])

  const handleSelectCity = useCallback(
    (cityId: string) => {
      if (cityId !== selectedCityId && (draft?.stops.length ?? 0) > 0) {
        setDraft((current) => current ? ({ ...current, stops: [] }) : current)
        setActiveStopIndex(0)
        if (step !== "details" && step !== "scope") setStep("scope")
        setNotice("Changed city and cleared previous stops.")
      }
      setSelectedCityId(cityId)
      setSelectedFictionIds(getCityFictionIds(cityId))
      setSelectedPlaceId(null)
      return true
    },
    [draft?.stops.length, selectedCityId, step, getCityFictionIds],
  )

  const handlePlaceSelect = useCallback((place: Place) => {
    setSelectedPlaceId(place.id)
  }, [])

  const handleAddPlaceToTour = useCallback(
    (place: Place) => {
      if (!draft) return
      if (place.cityId !== selectedCityId) {
        setNotice("Only places from the selected city can be added.")
        return
      }
      if (draft.stops.some((stop) => stop.placeId === place.id)) {
        setNotice("This place is already in your draft.")
        return
      }
      setDraft((current) => current ? tours.addStopToDraft(current, place) : current)
      setActiveStopIndex(draft.stops.length)
      setNotice(`Added ${place.name}`)
    },
    [draft, selectedCityId, tours],
  )

  const handleRemoveStop = useCallback((stopId: string) => {
    setDraft((current) => current ? tours.removeStopFromDraft(current, stopId) : current)
  }, [tours])

  const handleDropAt = useCallback(
    (targetIndex: number) => {
      if (dragIndex == null) return
      setDraft((current) => current ? tours.reorderDraftStops(current, dragIndex, targetIndex) : current)
      setActiveStopIndex(targetIndex)
      setDragIndex(null)
    },
    [dragIndex, tours],
  )

  const handleUpdateStopNote = useCallback((stopId: string, note: string) => {
    setDraft((current) => {
      if (!current) return current
      return {
        ...current,
        stops: current.stops.map((stop) => (stop.id === stopId ? { ...stop, note } : stop)),
      }
    })
  }, [])

  const handleSuggestOrder = useCallback(async () => {
    if (!draft) return
    const suggested = await tours.suggestDraftStopsOrder(draft)
    if (areStopOrdersEqual(draft.stops, suggested.stops)) {
      setNotice("Current order already looks good.")
      return
    }
    setDraft(suggested)
    setActiveStopIndex(0)
    setNotice("Suggested order applied.")
  }, [draft, tours])

  const handleBannerUpload = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith("image/")) {
      setNotice("Please select an image file.")
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result !== "string") {
        setNotice("Could not read the selected image.")
        return
      }
      setDraft((current) => current ? ({ ...current, coverImage: result }) : current)
      setNotice("Banner image updated.")
    }
    reader.readAsDataURL(file)
    event.target.value = ""
  }, [])

  const handleSaveTour = useCallback(async () => {
    if (!user || !draft) return
    if (!draft.title.trim()) {
      setNotice("Add a title before creating the tour.")
      setStep("details")
      return
    }
    if (!selectedCityId || selectedFictionIds.length === 0) {
      setNotice("Select city and fictions before creating.")
      setStep("scope")
      return
    }
    if (draft.stops.length === 0) {
      setNotice("Add at least one stop before creating.")
      setStep("places")
      return
    }

    const hasInvalidCityStop = draft.stops.some((stop) => placeById.get(stop.placeId)?.cityId !== selectedCityId)
    if (hasInvalidCityStop) {
      setNotice("Some stops do not match the selected city.")
      setStep("places")
      return
    }

    const normalizedDraft: TourDraft = {
      ...draft,
      mode: "singleCity",
      cityId: selectedCityId || null,
      title: draft.title.trim(),
      description: draft.description.trim(),
    }

    const savedTour = await tours.saveDraftTour(normalizedDraft, user.id)
    setDraft(normalizedDraft)
    setLastSavedSlug(savedTour.slug)
    setCopied(false)
    setNotice("Tour created. You can share the public link.")
  }, [draft, selectedCityId, selectedFictionIds, user, placeById, tours])

  const handleCopyLink = useCallback(async () => {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setNotice("Link copied.")
    } catch {
      setNotice("Unable to copy link on this browser.")
    }
  }, [shareUrl])

  const selectedPlaceAlreadyInDraft = selectedPlace && draft
    ? draft.stops.some((stop) => stop.placeId === selectedPlace.id)
    : false

  if (!draft) {
    return (
      <div className="flex h-full items-center justify-center bg-background text-sm text-muted-foreground">
        Loading…
      </div>
    )
  }

  return (
    <>
      <div className="h-full min-w-0 overflow-hidden bg-background text-foreground">
        <div className="grid h-full min-h-0 grid-cols-1 grid-rows-[1fr_40vh] lg:grid-cols-[560px_1fr] lg:grid-rows-1">
          <aside className="min-h-0 border-r border-border bg-card/95 backdrop-blur-sm">
            <div className="flex h-full min-h-0 flex-col">
              <div className="border-b border-border px-5 py-4">
                <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Tour Studio</p>
                <h1 className="mt-1 text-lg font-semibold tracking-tight text-foreground">Create Tour</h1>
                <p className="mt-1 text-xs text-muted-foreground">{STEP_META[step].subtitle}</p>

                <div className="mt-3 h-1.5 w-full rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  Step {currentStepIndex + 1} of {STEP_SEQUENCE.length}
                </p>

                <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                  {STEP_SEQUENCE.map((item, index) => {
                    const Icon = STEP_META[item].icon
                    const isActive = item === step
                    const isComplete = index < currentStepIndex
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => {
                          if (index <= currentStepIndex) setStep(item)
                        }}
                        className={cn(
                          "flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] whitespace-nowrap transition-colors",
                          isActive
                            ? "border-primary bg-primary/10 text-foreground"
                            : isComplete
                              ? "border-border bg-muted text-foreground"
                              : "border-border bg-card text-muted-foreground",
                        )}
                      >
                        <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-muted text-[10px] text-foreground">
                          {index + 1}
                        </span>
                        <Icon className="h-3.5 w-3.5" />
                        <span>{STEP_META[item].label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="px-5 pt-4">
                <div className="relative overflow-hidden rounded-xl border border-border bg-card">
                  <div className="relative h-28 w-full">
                    <Image src={bannerPreview} alt="Tour preview banner" fill sizes="560px" className="object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
                  </div>
                  <div className="px-3 py-2">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Draft Preview</p>
                    <p className="mt-1 truncate text-sm font-semibold text-foreground">
                      {draft.title.trim() || "Untitled Tour"}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {selectedCityName} · {resolvedStops.length} stops
                    </p>
                  </div>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                <h2 className="mb-3 text-sm font-semibold text-foreground">{STEP_META[step].title}</h2>

                {step === "details" && (
                  <div className="space-y-4">
                    <section className="rounded-xl border border-border bg-card p-3 space-y-3">
                      <div>
                        <label className="mb-1 block text-xs text-muted-foreground">Banner image</label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleBannerUpload}
                          className="block w-full rounded-md border border-border bg-muted px-3 py-2 text-xs text-foreground file:mr-3 file:rounded file:border-0 file:bg-primary file:px-2 file:py-1 file:text-primary-foreground"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-muted-foreground">Tour title *</label>
                        <Input
                          value={draft.title}
                          onChange={(event) =>
                            setDraft((current) => current ? ({ ...current, title: event.target.value }) : current)
                          }
                          placeholder="Tarantino Experience"
                          className="border-border bg-muted text-foreground"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-muted-foreground">Description</label>
                        <Textarea
                          value={draft.description}
                          onChange={(event) =>
                            setDraft((current) => current ? ({ ...current, description: event.target.value }) : current)
                          }
                          placeholder="A cinematic walk through iconic scenes..."
                          className="min-h-[100px] border-border bg-muted text-foreground"
                        />
                      </div>
                    </section>
                  </div>
                )}

                {step === "scope" && (
                  <div className="space-y-4">
                    <section className="rounded-xl border border-border bg-card p-3">
                      <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">City</p>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsCityPickerOpen(true)}
                        className="h-9 w-full justify-start border-border bg-muted text-left text-xs text-foreground"
                      >
                        <span className="truncate">{selectedCityName}</span>
                      </Button>
                    </section>

                    <section className="rounded-xl border border-border bg-card p-3">
                      <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Fictions</p>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsFictionPickerOpen(true)}
                        className="h-9 w-full justify-start border-border bg-muted text-left text-xs text-foreground"
                      >
                        <span className="truncate">{selectedFictionsSummary}</span>
                      </Button>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {selectedFictionNames.map((fictionName) => (
                          <Badge key={fictionName} variant="secondary" className="text-[10px] font-normal">
                            {fictionName}
                          </Badge>
                        ))}
                      </div>
                    </section>
                  </div>
                )}

                {step === "places" && (
                  <div className="space-y-4">
                    <section className="rounded-xl border border-border bg-card p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs text-muted-foreground">{selectedCityName} · {selectedFictionIds.length} fictions</p>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsCityPickerOpen(true)}
                            className="h-8 border-border bg-muted px-2 text-xs text-foreground"
                          >
                            City
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsFictionPickerOpen(true)}
                            className="h-8 border-border bg-muted px-2 text-xs text-foreground"
                          >
                            Fictions
                          </Button>
                        </div>
                      </div>
                    </section>

                    <section className="rounded-xl border border-border bg-card">
                      <div className="border-b border-border px-3 py-2">
                        <p className="text-sm font-medium">Places ({filteredPlaces.length})</p>
                      </div>
                      {filteredPlaces.length === 0 ? (
                        <div className="p-4 text-sm text-muted-foreground">No places match this selection.</div>
                      ) : (
                        <div className="max-h-[58vh] space-y-2 overflow-y-auto p-3">
                          {filteredPlaces.map((place) => {
                            const isSelected = place.id === selectedPlaceId
                            const isInDraft = draft.stops.some((stop) => stop.placeId === place.id)
                            return (
                              <div
                                key={place.id}
                                role="button"
                                tabIndex={0}
                                onClick={() => setSelectedPlaceId(place.id)}
                                onKeyDown={(event) => {
                                  if (event.key === "Enter" || event.key === " ") {
                                    event.preventDefault()
                                    setSelectedPlaceId(place.id)
                                  }
                                }}
                                aria-pressed={isSelected}
                                className={cn(
                                  "w-full rounded-lg border p-2 text-left transition-colors",
                                  isSelected
                                    ? "border-primary bg-primary/10"
                                    : "border-border bg-muted hover:border-primary/50",
                                )}
                              >
                                <div className="flex items-center gap-2">
                                  <div className="relative h-14 w-14 overflow-hidden rounded-md border border-border">
                                    <Image
                                      src={place.coverImage}
                                      alt={place.name}
                                      fill
                                      sizes="56px"
                                      className="object-cover"
                                    />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-semibold">{place.name}</p>
                                    <p className="truncate text-xs text-muted-foreground">
                                      {cityNameById.get(place.cityId)}
                                    </p>
                                    <div className="mt-1 flex flex-wrap gap-1">
                                      {place.fictionIds.slice(0, 2).map((fictionId) => (
                                        <Badge
                                          key={fictionId}
                                          variant="secondary"
                                          className="text-[10px] font-normal"
                                        >
                                          {fictionNameById.get(fictionId) ?? fictionId}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                  <Button
                                    type="button"
                                    disabled={isInDraft}
                                    onClick={(event) => {
                                      event.stopPropagation()
                                      handleAddPlaceToTour(place)
                                    }}
                                    className={cn(
                                      "h-8 w-8 p-0",
                                      isInDraft
                                        ? "bg-muted text-muted-foreground hover:bg-muted"
                                        : "bg-destructive text-destructive-foreground hover:bg-destructive/90",
                                    )}
                                    aria-label={isInDraft ? `${place.name} added` : `Add ${place.name}`}
                                  >
                                    {isInDraft ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                                  </Button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </section>
                  </div>
                )}

                {step === "route" && (
                  <div className="space-y-4">
                    <section className="rounded-xl border border-border bg-card p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">Stops ({resolvedStops.length})</p>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleSuggestOrder}
                          className="h-8 border-border bg-transparent px-2 text-xs text-foreground"
                        >
                          Suggest Order
                        </Button>
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground">Drag to reorder, then add notes per stop.</p>
                    </section>

                    <section className="rounded-xl border border-border bg-card">
                      {resolvedStops.length === 0 ? (
                        <div className="p-4 text-sm text-muted-foreground">No stops selected.</div>
                      ) : (
                        <div className="max-h-[62vh] space-y-2 overflow-y-auto p-3">
                          {resolvedStops.map((stop, index) => (
                            <div
                              key={stop.id}
                              draggable
                              onDragStart={() => setDragIndex(index)}
                              onDragOver={(event) => event.preventDefault()}
                              onDrop={() => handleDropAt(index)}
                              onClick={() => setActiveStopIndex(index)}
                              className={cn(
                                "rounded-lg border p-2",
                                activeStopIndex === index
                                  ? "border-primary bg-primary/10"
                                  : "border-border bg-muted",
                              )}
                            >
                              <div className="flex items-center gap-2">
                                <GripVertical className="h-4 w-4 text-muted-foreground" />
                                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                                  {index + 1}
                                </div>
                                <div className="relative h-11 w-11 overflow-hidden rounded-md border border-border">
                                  <Image
                                    src={stop.place.coverImage}
                                    alt={stop.place.name}
                                    fill
                                    sizes="44px"
                                    className="object-cover"
                                  />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-medium">{stop.place.name}</p>
                                  <p className="truncate text-xs text-muted-foreground">
                                    {cityNameById.get(stop.place.cityId)}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation()
                                    handleRemoveStop(stop.id)
                                  }}
                                  className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                  aria-label={`Remove ${stop.place.name}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>

                              <div className="mt-2">
                                <label className="mb-1 block text-[11px] text-muted-foreground">Stop note</label>
                                <Textarea
                                  value={stop.note ?? ""}
                                  onClick={(event) => event.stopPropagation()}
                                  onChange={(event) => handleUpdateStopNote(stop.id, event.target.value)}
                                  placeholder="What should users notice at this stop?"
                                  className="min-h-[74px] border-border bg-muted text-xs text-foreground"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </section>
                  </div>
                )}

                {step === "review" && (
                  <div className="space-y-4">
                    <section className="rounded-xl border border-border bg-card p-3 space-y-2">
                      <p className="text-sm font-semibold">{draft.title || "Untitled Tour"}</p>
                      <p className="text-xs text-muted-foreground">
                        {draft.description.trim() || "No description provided."}
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded border border-border bg-muted px-2 py-1.5 text-muted-foreground">
                          <span className="text-foreground">City:</span> {selectedCityName}
                        </div>
                        <div className="rounded border border-border bg-muted px-2 py-1.5 text-muted-foreground">
                          <span className="text-foreground">Stops:</span> {resolvedStops.length}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {selectedFictionNames.map((fictionName) => (
                          <Badge key={fictionName} variant="secondary" className="text-[10px] font-normal">
                            {fictionName}
                          </Badge>
                        ))}
                      </div>
                    </section>

                    <section className="rounded-xl border border-border bg-card p-3">
                      <label className="mb-1 block text-xs text-muted-foreground">Visibility</label>
                      <select
                        value={draft.visibility}
                        onChange={(event) =>
                          setDraft((current) =>
                            current
                              ? { ...current, visibility: event.target.value as TourDraft["visibility"] }
                              : current,
                          )
                        }
                        className="h-10 w-full rounded-md border border-border bg-muted px-3 text-sm text-foreground outline-none focus:border-primary"
                      >
                        <option value="public">Public</option>
                        <option value="private">Private</option>
                      </select>
                    </section>

                    <section className="rounded-xl border border-border bg-card p-3">
                      <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Stops preview</p>
                      <div className="max-h-[36vh] space-y-2 overflow-y-auto">
                        {resolvedStops.map((stop, index) => (
                          <div key={stop.id} className="rounded border border-border bg-muted p-2">
                            <p className="text-xs font-semibold text-foreground">
                              {index + 1}. {stop.place.name}
                            </p>
                            {stop.note && <p className="mt-1 text-xs text-muted-foreground">{stop.note}</p>}
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>
                )}
              </div>

              <div className="border-t border-border p-3">
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!previousStep}
                    onClick={handlePreviousStep}
                    className="h-10 border-border bg-transparent text-foreground disabled:opacity-40"
                  >
                    Back
                  </Button>

                  {step === "review" ? (
                    <Button
                      type="button"
                      onClick={handleSaveTour}
                      className="h-10 bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      Create Tour
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      onClick={handleNextStep}
                      className="h-10 bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      Next{nextStep ? `: ${STEP_META[nextStep].title.replace("Step ", "")}` : ""}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </aside>

          <section className="relative h-full border-t border-border lg:border-l lg:border-t-0">
            <ToursMap
              selectedCityId={selectedCityId}
              places={filteredPlaces}
              showExploreMarkers={step === "places"}
              showPolyline={step === "route" || step === "review"}
              selectedPlaceId={selectedPlaceId}
              onSelectPlace={step === "places" ? handlePlaceSelect : undefined}
              stops={resolvedStops}
              activeStopIndex={resolvedStops.length > 0 ? activeStopIndex : undefined}
              onSelectStop={setActiveStopIndex}
              showStopNumbers={false}
            />

            <div className="pointer-events-none absolute right-4 top-4 rounded-xl border border-border bg-card/90 px-3 py-2 shadow-xl backdrop-blur-sm">
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Live Map</p>
              <p className="mt-1 text-xs font-semibold text-foreground">{STEP_META[step].label}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {selectedCityName} · {resolvedStops.length} stops
              </p>
            </div>

            {step === "places" && selectedPlace && (
              <div className="absolute bottom-4 left-4 w-[320px] rounded-xl border border-border bg-background/95 p-3 shadow-2xl backdrop-blur">
                <div className="flex gap-2">
                  <div className="relative h-16 w-16 overflow-hidden rounded-md border border-border">
                    <Image
                      src={selectedPlace.coverImage}
                      alt={selectedPlace.name}
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{selectedPlace.name}</p>
                    <p className="text-xs text-muted-foreground">{cityNameById.get(selectedPlace.cityId)}</p>
                    <Button
                      type="button"
                      size="sm"
                      disabled={selectedPlaceAlreadyInDraft}
                      onClick={() => handleAddPlaceToTour(selectedPlace)}
                      className={cn(
                        "mt-2 h-8 px-2 text-xs",
                        selectedPlaceAlreadyInDraft
                          ? "bg-muted text-muted-foreground hover:bg-muted"
                          : "bg-destructive text-destructive-foreground hover:bg-destructive/90",
                      )}
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" />
                      {selectedPlaceAlreadyInDraft ? "Added" : "Add to Tour"}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {shareUrl && (
              <div className="absolute bottom-4 right-4 w-[320px] rounded-lg border border-border bg-card/95 p-2 shadow-xl backdrop-blur">
                <p className="text-[11px] text-muted-foreground">Public link</p>
                <p className="truncate text-xs text-foreground">{shareUrl}</p>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-2 h-8 w-full border-border bg-transparent text-xs text-foreground"
                  onClick={handleCopyLink}
                >
                  <Copy className="mr-1.5 h-3.5 w-3.5" />
                  {copied ? "Copied" : "Copy link"}
                </Button>
              </div>
            )}

            {notice && (
              <div className="absolute left-1/2 top-4 -translate-x-1/2 rounded-full border border-border bg-card/95 px-4 py-1.5 text-xs text-foreground shadow-lg">
                {notice}
              </div>
            )}
          </section>
        </div>
      </div>

      <Dialog open={isCityPickerOpen} onOpenChange={setIsCityPickerOpen}>
        <DialogContent className="max-w-md border-border bg-card text-foreground">
          <DialogHeader>
            <DialogTitle>Select City</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Pick one city for this tour.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {allCities.map((city) => {
              const isSelected = city.id === selectedCityId
              return (
                <button
                  key={city.id}
                  type="button"
                  onClick={() => {
                    const changed = handleSelectCity(city.id)
                    if (changed) setIsCityPickerOpen(false)
                  }}
                  className={cn(
                    "w-full rounded-lg border px-3 py-2 text-left transition-colors",
                    isSelected
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-muted text-muted-foreground hover:border-primary/50",
                  )}
                >
                  <p className="text-sm font-medium">{city.name}</p>
                  <p className="text-xs text-muted-foreground">{city.country}</p>
                </button>
              )
            })}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isFictionPickerOpen} onOpenChange={setIsFictionPickerOpen}>
        <DialogContent className="max-w-md border-border bg-card text-foreground">
          <DialogHeader>
            <DialogTitle>Select Fictions</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Only fictions available in this city are listed.
            </DialogDescription>
          </DialogHeader>

          {availableFictions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No fictions available for this city.</p>
          ) : (
            <div className="max-h-[42vh] space-y-2 overflow-y-auto pr-1">
              {availableFictions.map((fiction) => {
                const selected = selectedFictionIds.includes(fiction.id)
                return (
                  <button
                    key={fiction.id}
                    type="button"
                    onClick={() => handleToggleFiction(fiction.id)}
                    className={cn(
                      "w-full rounded-lg border px-3 py-2 text-left transition-colors",
                      selected
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border bg-muted text-muted-foreground hover:border-primary/50",
                    )}
                  >
                    <p className="text-sm font-medium">{fiction.title}</p>
                    <p className="text-xs text-muted-foreground">{fiction.type}</p>
                  </button>
                )
              })}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setSelectedFictionIds([])}
              className="border-border bg-transparent text-foreground"
            >
              Clear
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setSelectedFictionIds(availableFictions.map((fiction) => fiction.id))}
              className="border-border bg-transparent text-foreground"
            >
              Select All
            </Button>
            <Button
              type="button"
              onClick={() => setIsFictionPickerOpen(false)}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
