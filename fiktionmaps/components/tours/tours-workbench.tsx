"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Image from "next/image"
import { Check, Copy, GripVertical, Plus, Trash2 } from "lucide-react"
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
import { DEFAULT_FICTION_COVER } from "@/lib/constants/placeholders"
import { ToursMap } from "@/components/tours/tours-map"

type WizardStep = "details" | "places" | "route"

const STEP_SEQUENCE: WizardStep[] = ["details", "places", "route"]
const STEP_META: Record<WizardStep, { title: string; subtitle: string }> = {
  details: {
    title: "Step 1: Data",
    subtitle: "Title, city, and fictions.",
  },
  places: {
    title: "Step 2: Places",
    subtitle: "Pick places to include in your route.",
  },
  route: {
    title: "Step 3: Order",
    subtitle: "Order stops and finalize your tour.",
  },
}

function areStopOrdersEqual(left: TourDraft["stops"], right: TourDraft["stops"]): boolean {
  if (left.length !== right.length) return false
  return left.every((stop, index) => stop.id === right[index]?.id)
}

export function ToursWorkbench() {
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

  const availableFictions = useMemo(() => {
    const fictionIds = new Set(getCityFictionIds(selectedCityId))
    return allFictions.filter((fiction) => fictionIds.has(fiction.id))
  }, [selectedCityId, getCityFictionIds, allFictions])

  const selectedCityName = useMemo(
    () => cityNameById.get(selectedCityId) ?? selectedCityId,
    [cityNameById, selectedCityId],
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

  const routeMetrics = useMemo(() => tours.calculateTourMetrics(resolvedStops), [tours, resolvedStops])
  const selectedPlace = useMemo(
    () => filteredPlaces.find((place) => place.id === selectedPlaceId) ?? null,
    [filteredPlaces, selectedPlaceId],
  )

  const isDetailsReady =
    (draft?.title.trim().length ?? 0) > 0 && Boolean(selectedCityId) && selectedFictionIds.length > 0
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
      if (step === "route") setStep("places")
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
      if (candidate === "places") return isPlacesReady
      return true
    },
    [isDetailsReady, isPlacesReady],
  )

  const getStepBlockerMessage = useCallback((candidate: WizardStep): string => {
    if (candidate === "details") return "Add title, city, and at least one fiction."
    if (candidate === "places") return "Select at least one place to continue."
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
        if (step !== "details") setStep("details")
        setNotice("Changed city and cleared previous stops.")
      }
      setSelectedCityId(cityId)
      setSelectedFictionIds(getCityFictionIds(cityId))
      setSelectedPlaceId(null)
      return true
    },
    [draft?.stops.length, selectedCityId, step],
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

  const handleSaveTour = useCallback(async () => {
    if (!user || !draft) return
    if (!draft.title.trim()) {
      setNotice("Add a title before creating the tour.")
      setStep("details")
      return
    }
    if (!selectedCityId || selectedFictionIds.length === 0) {
      setNotice("Select city and fictions before creating.")
      setStep("details")
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
      creatorTips: draft.creatorTips?.trim() || "",
      estimatedMinutes:
        typeof draft.estimatedMinutes === "number" && Number.isFinite(draft.estimatedMinutes) && draft.estimatedMinutes > 0
          ? Math.round(draft.estimatedMinutes)
          : null,
      walkable: typeof draft.walkable === "boolean" ? draft.walkable : routeMetrics.suggestedWalkable,
    }

    const savedTour = await tours.saveDraftTour(normalizedDraft, user.id)
    setDraft(normalizedDraft)
    setLastSavedSlug(savedTour.slug)
    setCopied(false)
    setNotice("Tour created. You can share the public link.")
  }, [draft, routeMetrics.suggestedWalkable, selectedCityId, selectedFictionIds, user, placeById, tours])

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
      <div className="h-full overflow-hidden bg-background text-foreground">
        <div className="grid h-full min-h-0 grid-cols-1 lg:grid-cols-[560px_1fr]">
          <aside className="min-h-0 border-r border-border bg-card">
            <div className="flex h-full min-h-0 flex-col">
              <div className="border-b border-border px-5 py-4">
                <h1 className="text-lg font-semibold tracking-tight">Create Tour</h1>
                <p className="mt-1 text-xs text-muted-foreground">{STEP_META[step].subtitle}</p>
                <div
                  className="mt-3 grid gap-1"
                  style={{ gridTemplateColumns: `repeat(${STEP_SEQUENCE.length}, minmax(0, 1fr))` }}
                >
                  {STEP_SEQUENCE.map((item, index) => {
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
                          "rounded-md border px-2 py-1 text-[11px] uppercase tracking-wide",
                          isActive
                            ? "border-primary bg-primary/10 text-foreground"
                            : isComplete
                              ? "border-border bg-muted text-foreground"
                              : "border-border bg-card text-muted-foreground",
                        )}
                      >
                        {index + 1}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                <h2 className="mb-3 text-sm font-semibold text-foreground">{STEP_META[step].title}</h2>

                {step === "details" && (
                  <section className="space-y-3">
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

                    <div>
                      <label className="mb-1 block text-xs text-muted-foreground">City</label>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsCityPickerOpen(true)}
                        className="h-9 w-full justify-start border-border bg-muted text-left text-xs text-foreground"
                      >
                        <span className="truncate">{selectedCityName}</span>
                      </Button>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs text-muted-foreground">Fictions</label>
                      {availableFictions.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No fictions available for this city.</p>
                      ) : (
                        <div className="space-y-2">
                          {availableFictions.map((fiction) => {
                            const isSelected = selectedFictionIds.includes(fiction.id)
                            return (
                              <button
                                key={fiction.id}
                                type="button"
                                onClick={() => handleToggleFiction(fiction.id)}
                                className={cn(
                                  "flex w-full items-center gap-2 rounded-lg border p-2 text-left transition-colors",
                                  isSelected
                                    ? "border-primary bg-primary/10"
                                    : "border-border bg-muted hover:border-primary/50",
                                )}
                                aria-pressed={isSelected}
                              >
                                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md border border-border">
                                  <Image
                                    src={fiction.coverImage?.trim() || DEFAULT_FICTION_COVER}
                                    alt={fiction.title}
                                    fill
                                    sizes="40px"
                                    className="object-cover"
                                  />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-xs text-foreground">{fiction.title}</p>
                                  <p className="text-[11px] text-muted-foreground">{fiction.type}</p>
                                </div>
                                {isSelected && <Check className="h-4 w-4 shrink-0 text-primary" />}
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </section>
                )}

                {step === "places" && (
                  <div className="space-y-3">
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

                    <section>
                      <p className="mb-2 text-sm font-medium">Places ({filteredPlaces.length})</p>
                      {filteredPlaces.length === 0 ? (
                        <div className="text-sm text-muted-foreground">No places match this selection.</div>
                      ) : (
                        <div className="max-h-[58vh] space-y-2 overflow-y-auto pr-1">
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
                  <div className="space-y-3">
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
                    <p className="text-[11px] text-muted-foreground">Drag to reorder, then add notes per stop.</p>

                    <section>
                      {resolvedStops.length === 0 ? (
                        <div className="text-sm text-muted-foreground">No stops selected.</div>
                      ) : (
                        <div className="max-h-[62vh] space-y-2 overflow-y-auto pr-1">
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
                                  placeholder="Example: Best at 3pm, gelato shop across the street, less crowded on weekdays."
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

                  {step === "route" ? (
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
                      Next
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </aside>

          <section className="relative h-full">
            <ToursMap
              selectedCityId={selectedCityId}
              places={filteredPlaces}
              showExploreMarkers={step === "places"}
              showPolyline={step === "route"}
              selectedPlaceId={selectedPlaceId}
              onSelectPlace={step === "places" ? handlePlaceSelect : undefined}
              stops={resolvedStops}
              activeStopIndex={resolvedStops.length > 0 ? activeStopIndex : undefined}
              onSelectStop={setActiveStopIndex}
              showStopNumbers={false}
            />

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
                    {selectedPlace.address && (
                      <p className="mt-1 line-clamp-1 text-[11px] text-muted-foreground">{selectedPlace.address}</p>
                    )}
                    {selectedPlace.visitTip && (
                      <p className="mt-1 line-clamp-2 text-[11px] text-foreground">
                        Tip: {selectedPlace.visitTip}
                      </p>
                    )}
                    {selectedPlace.description && (
                      <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
                        {selectedPlace.description}
                      </p>
                    )}
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
