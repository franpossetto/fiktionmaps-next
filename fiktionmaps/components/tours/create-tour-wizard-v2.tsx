"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Image from "next/image"
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  GripVertical,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { SearchInput } from "@/components/ui/search-input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { PageStickyBar } from "@/components/layout/page-sticky-bar"
import { cn } from "@/lib/utils"
import type { City } from "@/lib/modules/cities"
import type { Fiction } from "@/lib/modules/fictions"
import type { Place, TourDraft, TourStopWithPlace } from "@/lib/modules/tours"
import { useApi } from "@/lib/api"
import { useAuth } from "@/context/auth-context"
import { DEFAULT_FICTION_COVER } from "@/lib/constants/placeholders"
import { MapProvider, MapContainer, MapMarker, MapPolyline } from "@/lib/map"
import { ToursMap } from "@/components/tours/tours-map"

const STEPS = ["name", "fictions", "places", "organize", "visualize"] as const
type StepId = (typeof STEPS)[number]

const STEP_LABELS: Record<StepId, string> = {
  name: "Name & City",
  fictions: "Fictions",
  places: "Places",
  organize: "Organize",
  visualize: "Visualize",
}

function areStopOrdersEqual(left: TourDraft["stops"], right: TourDraft["stops"]): boolean {
  if (left.length !== right.length) return false
  return left.every((stop, index) => stop.id === right[index]?.id)
}

export function CreateTourWizardV2() {
  const { user } = useAuth()
  const { cities: cityService, fictions: fictionService, tours } = useApi()

  const [step, setStep] = useState<StepId>("name")
  const [tourName, setTourName] = useState("")
  const [tourDescription, setTourDescription] = useState("")
  const [selectedCityId, setSelectedCityId] = useState<string>("")
  const [selectedFictionIds, setSelectedFictionIds] = useState<string[]>([])
  const [draft, setDraft] = useState<TourDraft | null>(null)
  const [allCities, setAllCities] = useState<City[]>([])
  const [allFictions, setAllFictions] = useState<Fiction[]>([])
  const [allPlaces, setAllPlaces] = useState<Place[]>([])
  const [filteredPlaces, setFilteredPlaces] = useState<Place[]>([])
  const [resolvedStops, setResolvedStops] = useState<TourStopWithPlace[]>([])
  const [citySearchQuery, setCitySearchQuery] = useState("")
  const [citySelectOpen, setCitySelectOpen] = useState(false)
  const [placeSearchQuery, setPlaceSearchQuery] = useState("")
  const [placeFictionFilter, setPlaceFictionFilter] = useState<string>("all")
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null)
  const [activeStopIndex, setActiveStopIndex] = useState(0)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [lastSavedSlug, setLastSavedSlug] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const placeById = useMemo(() => new Map(allPlaces.map((p) => [p.id, p])), [allPlaces])
  const cityNameById = useMemo(() => new Map(allCities.map((c) => [c.id, c.name])), [allCities])
  const fictionNameById = useMemo(() => new Map(allFictions.map((f) => [f.id, f.title])), [allFictions])

  const currentStepIndex = STEPS.indexOf(step)
  const isFirstStep = currentStepIndex === 0
  const isLastStep = currentStepIndex === STEPS.length - 1

  const filteredCities = useMemo(() => {
    const q = citySearchQuery.trim().toLowerCase()
    if (!q) return allCities
    return allCities.filter(
      (city) =>
        city.name.toLowerCase().includes(q) || city.country.toLowerCase().includes(q),
    )
  }, [allCities, citySearchQuery])

  const availableFictions = useMemo(() => {
    if (!selectedCityId) return []
    const cityPlaceIds = new Set(allPlaces.filter((p) => p.cityId === selectedCityId).flatMap((p) => p.fictionIds))
    return allFictions.filter((f) => cityPlaceIds.has(f.id))
  }, [selectedCityId, allPlaces, allFictions])

  const selectedCityName = cityNameById.get(selectedCityId) ?? selectedCityId

  const selectedCity = useMemo(
    () => allCities.find((c) => c.id === selectedCityId) ?? null,
    [allCities, selectedCityId],
  )

  const routeMetrics = useMemo(
    () => tours.calculateTourMetrics(resolvedStops),
    [tours, resolvedStops],
  )

  const placesForMap = useMemo(() => {
    if (!selectedCityId || selectedFictionIds.length === 0) return []
    return allPlaces.filter(
      (p) =>
        p.cityId === selectedCityId &&
        p.fictionIds.some((fid) => selectedFictionIds.includes(fid)),
    )
  }, [allPlaces, selectedCityId, selectedFictionIds])

  useEffect(() => {
    Promise.all([cityService.getAll(), fictionService.getAll(), tours.buildPlaces()]).then(
      ([c, f, p]) => {
        setAllCities(c)
        setAllFictions(f)
        setAllPlaces(p)
        if (c.length > 0 && !selectedCityId) setSelectedCityId(c[0].id)
      },
    )
  }, [cityService, fictionService, tours])

  useEffect(() => {
    if (allPlaces.length === 0 || !selectedCityId) return
    const cityFictionIds = Array.from(
      new Set(allPlaces.filter((p) => p.cityId === selectedCityId).flatMap((p) => p.fictionIds)),
    )
    setSelectedFictionIds((prev) => {
      if (prev.length === 0) return cityFictionIds
      return prev.filter((id) => cityFictionIds.includes(id))
    })
  }, [allPlaces, selectedCityId])

  useEffect(() => {
    if (allPlaces.length === 0 || !selectedCityId) return
    const fictionIds =
      placeFictionFilter === "all"
        ? selectedFictionIds.length > 0
          ? selectedFictionIds
          : ["__none__"]
        : [placeFictionFilter]
    tours
      .filterPlaces(allPlaces, {
        cityIds: [selectedCityId],
        fictionIds,
        query: placeSearchQuery.trim() || undefined,
      })
      .then(setFilteredPlaces)
  }, [tours, allPlaces, selectedCityId, selectedFictionIds, placeSearchQuery, placeFictionFilter])

  useEffect(() => {
    if (!draft) return
    tours.resolveDraftStops(draft.stops).then(setResolvedStops)
  }, [tours, draft?.stops])

  useEffect(() => {
    if (resolvedStops.length === 0) setActiveStopIndex(0)
    else setActiveStopIndex((prev) => Math.min(prev, resolvedStops.length - 1))
  }, [resolvedStops.length])

  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => setNotice(null), 2600)
    return () => clearTimeout(t)
  }, [notice])

  const createDraftIfNeeded = useCallback(() => {
    if (draft || !selectedCityId) return
    const newDraft = tours.createDraft("singleCity", selectedCityId)
    setDraft({
      ...newDraft,
      title: tourName.trim() || "Untitled Tour",
      description: tourDescription.trim(),
    })
  }, [draft, selectedCityId, tourName, tourDescription, tours])

  const goNext = useCallback(() => {
    if (step === "name") {
      if (!tourName.trim()) {
        setNotice("Enter a tour name to continue.")
        return
      }
      if (!selectedCityId) {
        setNotice("Select a city to continue.")
        return
      }
      createDraftIfNeeded()
    }
    if (step === "fictions" && selectedFictionIds.length === 0) {
      setNotice("Select at least one fiction.")
      return
    }
    if (step === "places" && resolvedStops.length === 0) {
      setNotice("Order at least one place in your tour.")
      return
    }
    if (isLastStep) return
    setStep(STEPS[currentStepIndex + 1]!)
  }, [
    step,
    tourName,
    selectedCityId,
    selectedFictionIds,
    resolvedStops.length,
    isLastStep,
    currentStepIndex,
    createDraftIfNeeded,
  ])

  const goBack = useCallback(() => {
    if (isFirstStep) return
    setStep(STEPS[currentStepIndex - 1]!)
  }, [isFirstStep, currentStepIndex])

  const handleSelectCity = useCallback((cityId: string) => {
    setSelectedCityId(cityId)
    setCitySelectOpen(false)
    const cityPlaces = allPlaces.filter((p) => p.cityId === cityId)
    const fictionIds = Array.from(new Set(cityPlaces.flatMap((p) => p.fictionIds)))
    setSelectedFictionIds(fictionIds)
  }, [allPlaces])

  const handleToggleFiction = useCallback((fictionId: string) => {
    setSelectedFictionIds((prev) =>
      prev.includes(fictionId) ? prev.filter((id) => id !== fictionId) : [...prev, fictionId],
    )
  }, [])

  const handleAddPlace = useCallback(
    (place: Place) => {
      if (!draft) return
      if (place.cityId !== selectedCityId) {
        setNotice("This place is not in the selected city.")
        return
      }
      if (draft.stops.some((s) => s.placeId === place.id)) {
        setNotice("Already in tour.")
        return
      }
      setDraft((d) => (d ? tours.addStopToDraft(d, place) : d))
      setNotice(`Added ${place.name}`)
    },
    [draft, selectedCityId, tours],
  )

  const handleRemoveStop = useCallback(
    (stopId: string) => {
      setDraft((d) => (d ? tours.removeStopFromDraft(d, stopId) : d))
    },
    [tours],
  )

  const handleTogglePlaceInTour = useCallback(
    (place: Place) => {
      if (!draft) return
      const stop = draft.stops.find((s) => s.placeId === place.id)
      if (stop) {
        handleRemoveStop(stop.id)
        setNotice(`Removed ${place.name}`)
      } else {
        handleAddPlace(place)
      }
    },
    [draft, handleAddPlace, handleRemoveStop],
  )

  const handleDropAt = useCallback(
    (targetIndex: number) => {
      if (dragIndex == null || !draft) return
      if (dragIndex === targetIndex) return
      setDraft(tours.reorderDraftStops(draft, dragIndex, targetIndex))
      setActiveStopIndex(targetIndex)
      setDragIndex(null)
    },
    [dragIndex, draft, tours],
  )

  const handleUpdateStopNote = useCallback((stopId: string, note: string) => {
    setDraft((d) =>
      !d
        ? d
        : {
            ...d,
            stops: d.stops.map((s) => (s.id === stopId ? { ...s, note } : s)),
          },
    )
  }, [])

  const handleSuggestOrder = useCallback(async () => {
    if (!draft) return
    const suggested = await tours.suggestDraftStopsOrder(draft)
    if (areStopOrdersEqual(draft.stops, suggested.stops)) {
      setNotice("Order already optimal.")
      return
    }
    setDraft(suggested)
    setActiveStopIndex(0)
    setNotice("Order updated.")
  }, [draft, tours])

  const handleSaveTour = useCallback(async () => {
    if (!user || !draft) return
    const title = tourName.trim() || draft.title
    if (!title) {
      setNotice("Add a title.")
      return
    }
    if (!selectedCityId || selectedFictionIds.length === 0) {
      setNotice("Select city and fictions.")
      return
    }
    if (draft.stops.length === 0) {
      setNotice("Add at least one stop.")
      return
    }
    const normalized: TourDraft = {
      ...draft,
      title,
      description: tourDescription.trim() || draft.description,
      mode: "singleCity",
      cityId: selectedCityId,
    }
    const saved = await tours.saveDraftTour(normalized, user.id)
    setLastSavedSlug(saved.slug)
    setNotice("Tour created. Share the link below.")
  }, [user, draft, tourName, tourDescription, selectedCityId, selectedFictionIds, tours])

  const handleCopyLink = useCallback(async () => {
    if (!lastSavedSlug) return
    const url = typeof window !== "undefined" ? `${window.location.origin}/tours/${lastSavedSlug}` : ""
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setNotice("Link copied.")
    } catch {
      setNotice("Could not copy.")
    }
  }, [lastSavedSlug])

  const selectedPlace = useMemo(
    () => filteredPlaces.find((p) => p.id === selectedPlaceId) ?? null,
    [filteredPlaces, selectedPlaceId],
  )

  const canProceed =
    (step === "name" && tourName.trim().length > 0 && !!selectedCityId) ||
    (step === "fictions" && selectedFictionIds.length > 0) ||
    (step === "places" && resolvedStops.length > 0) ||
    step === "organize" ||
    step === "visualize"

  const stepContent = (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageStickyBar
        className="shrink-0 px-4 py-3 md:px-6"
        innerClassName="flex items-center justify-between gap-4"
        leading={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={goBack}
            disabled={isFirstStep}
            className="gap-1 text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>
        }
        title={
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-foreground">Create tour</span>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Step {currentStepIndex + 1} of {STEPS.length}
            </span>
            <div className="flex gap-1">
              {STEPS.map((s, i) => (
                <div
                  key={s}
                  className={cn(
                    "h-1.5 w-5 rounded-full transition-colors",
                    i <= currentStepIndex ? "bg-primary" : "bg-muted",
                  )}
                />
              ))}
            </div>
          </div>
        }
        trailing={
          isLastStep ? (
            <Button type="button" size="sm" onClick={handleSaveTour}>
              Create Tour
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              onClick={goNext}
              disabled={!canProceed}
              className="gap-1"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          )
        }
      />

      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        {step === "name" && (
          <div className="mx-auto max-w-md space-y-5 pt-6">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Name your tour</h1>
            <p className="text-sm text-muted-foreground">Give it a title and choose where it takes place.</p>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Tour name</label>
              <Input
                value={tourName}
                onChange={(e) => setTourName(e.target.value)}
                placeholder="e.g. Cinema spots in Paris"
                className="h-10 border-border bg-background text-sm"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Description (optional)</label>
              <Textarea
                value={tourDescription}
                onChange={(e) => setTourDescription(e.target.value)}
                placeholder="A short description for your tour..."
                className="min-h-[72px] resize-none border-border bg-background text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">City</label>
              <Popover open={citySelectOpen} onOpenChange={setCitySelectOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-left text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                      !selectedCityId && "text-muted-foreground",
                    )}
                  >
                    <span className="truncate">
                      {selectedCityId
                        ? (() => {
                            const c = allCities.find((x) => x.id === selectedCityId)
                            return c ? `${c.name}, ${c.country}` : selectedCityName
                          })()
                        : "Select city"}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                  <div className="border-b border-border p-2">
                    <SearchInput
                      value={citySearchQuery}
                      onChange={setCitySearchQuery}
                      placeholder="Search city or country..."
                      size="compact"
                      className="w-full"
                    />
                  </div>
                  <div className="max-h-[240px] overflow-y-auto p-1">
                    {filteredCities.length === 0 ? (
                      <p className="py-3 text-center text-xs text-muted-foreground">
                        {allCities.length === 0 ? "Loading…" : "No match."}
                      </p>
                    ) : (
                      filteredCities.map((city) => (
                        <button
                          key={city.id}
                          type="button"
                          onClick={() => handleSelectCity(city.id)}
                          className={cn(
                            "flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs transition-colors",
                            selectedCityId === city.id
                              ? "bg-primary/10 text-foreground"
                              : "text-foreground hover:bg-muted",
                          )}
                        >
                          <span className="truncate">{city.name}, {city.country}</span>
                          {selectedCityId === city.id && <Check className="h-3 w-3 shrink-0 text-primary" />}
                        </button>
                      ))
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        )}

        {step === "fictions" && (
          <div className="mx-auto max-w-lg space-y-6 pt-8">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Pick fictions</h1>
            <p className="text-sm text-muted-foreground">
              Select the fictions (films, books, etc.) that your tour will cover in {selectedCityName}.
            </p>
            {availableFictions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No fictions in this city yet.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {availableFictions.map((fiction) => {
                  const selected = selectedFictionIds.includes(fiction.id)
                  return (
                    <button
                      key={fiction.id}
                      type="button"
                      onClick={() => handleToggleFiction(fiction.id)}
                      className={cn(
                        "flex items-center gap-3 rounded-xl border-2 p-3 text-left transition-all",
                        selected
                          ? "border-primary bg-primary/5"
                          : "border-border bg-card hover:border-primary/40",
                      )}
                    >
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-border">
                        <Image
                          src={fiction.coverImage?.trim() || DEFAULT_FICTION_COVER}
                          alt=""
                          fill
                          sizes="48px"
                          className="object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-foreground">{fiction.title}</p>
                        <p className="text-xs text-muted-foreground">{fiction.type}</p>
                      </div>
                      {selected && <Check className="h-5 w-5 shrink-0 text-primary" />}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {step === "places" && (
          <div className="space-y-3">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">Order places</h1>
            <p className="text-sm text-muted-foreground">
              See the map, then pick stops below. Click a place to order in your tour (add or remove).
            </p>
            {selectedCityId && (
              <div className="aspect-square w-full shrink-0 overflow-hidden rounded-xl border border-border bg-muted/30">
                <ToursMap
                  selectedCityId={selectedCityId}
                  places={placesForMap}
                  showExploreMarkers
                  showPolyline={false}
                  selectedPlaceId={selectedPlaceId}
                  onSelectPlace={(p) => setSelectedPlaceId(p.id)}
                  stops={resolvedStops}
                  activeStopIndex={resolvedStops.length > 0 ? activeStopIndex : undefined}
                  onSelectStop={setActiveStopIndex}
                  showStopNumbers={false}
                  interactive={false}
                />
              </div>
            )}
            <div className="flex flex-col gap-2 sm:flex-row">
              <SearchInput
                value={placeSearchQuery}
                onChange={setPlaceSearchQuery}
                placeholder="Search places..."
                size="compact"
                className="flex-1"
              />
              <select
                value={placeFictionFilter}
                onChange={(e) => setPlaceFictionFilter(e.target.value)}
                className="h-9 rounded-md border border-border bg-card px-3 text-sm text-foreground"
              >
                <option value="all">All fictions</option>
                {selectedFictionIds.map((id) => (
                  <option key={id} value={id}>
                    {fictionNameById.get(id) ?? id}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-xs text-muted-foreground">Filter the list below by search or fiction.</p>
<div className="space-y-1 pr-1">
                {filteredPlaces.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">No places match.</p>
              ) : (
                filteredPlaces.map((place) => {
                  const inTour = draft?.stops.some((s) => s.placeId === place.id)
                  return (
                    <div
                      key={place.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        setSelectedPlaceId(place.id)
                        handleTogglePlaceInTour(place)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault()
                          setSelectedPlaceId(place.id)
                          handleTogglePlaceInTour(place)
                        }
                      }}
                      className={cn(
                        "flex items-center gap-2 rounded-lg border-2 px-2 py-1.5 transition-all cursor-pointer",
                        inTour
                          ? "border-emerald-500 bg-emerald-500/15 dark:bg-emerald-500/20"
                          : "border-border bg-card/80 hover:border-primary/40",
                      )}
                    >
                      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md border border-border">
                        <Image
                          src={place.coverImage}
                          alt=""
                          fill
                          sizes="40px"
                          className="object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{place.name}</p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {place.fictionIds.map((id) => fictionNameById.get(id)).filter(Boolean).join(", ")}
                        </p>
                      </div>
                      {inTour && (
                        <span className="flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                          <Check className="h-3.5 w-3.5" />
                          In tour
                        </span>
                      )}
                    </div>
                  )
                })
              )}
            </div>
            {draft && draft.stops.length > 0 && (
              <p className="text-xs text-muted-foreground">{draft.stops.length} place(s) in tour</p>
            )}
          </div>
        )}

        {step === "organize" && (
          <div className="space-y-3">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">Order stops</h1>
            <p className="text-sm text-muted-foreground">Drag to reorder. Add notes for each stop.</p>
            {selectedCityId && resolvedStops.length > 0 && (
              <div className="aspect-square w-full shrink-0 overflow-hidden rounded-xl border border-border bg-muted/30">
                <ToursMap
                  selectedCityId={selectedCityId}
                  places={[]}
                  showExploreMarkers={false}
                  showPolyline
                  selectedPlaceId={null}
                  stops={resolvedStops}
                  activeStopIndex={activeStopIndex}
                  onSelectStop={setActiveStopIndex}
                  showStopNumbers
                  stopMarkerVariant="selectedPhotoOnly"
                  interactive={false}
                />
              </div>
            )}
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">Stops in route</p>
              <Button type="button" variant="outline" size="sm" onClick={handleSuggestOrder} className="shrink-0">
                Suggest order
              </Button>
            </div>
            {resolvedStops.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No stops yet. Go back and add places.</p>
            ) : (
              <div className="space-y-1 pr-1">
                {resolvedStops.map((stop, index) => (
                  <div
                    key={stop.id}
                    onDragOver={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      e.dataTransfer.dropEffect = "move"
                      setDropTargetIndex(index)
                    }}
                    onDragLeave={(e) => {
                      if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                        setDropTargetIndex((i) => (i === index ? null : i))
                      }
                    }}
                    onDrop={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setDropTargetIndex(null)
                      handleDropAt(index)
                    }}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border-2 px-2 py-1.5 transition-colors",
                      activeStopIndex === index ? "border-primary bg-primary/5" : "border-border bg-card/80",
                      dragIndex === index && "opacity-50",
                      dropTargetIndex === index && dragIndex !== index && "border-primary border-dashed bg-primary/10",
                    )}
                  >
                    <div
                      draggable
                      onDragStart={(e) => {
                        setDragIndex(index)
                        setDropTargetIndex(null)
                        e.dataTransfer.effectAllowed = "move"
                        e.dataTransfer.setData("text/plain", String(index))
                        e.dataTransfer.clearData("text/html")
                      }}
                      onDragEnd={() => {
                        setDragIndex(null)
                        setDropTargetIndex(null)
                      }}
                      className="touch-none cursor-grab active:cursor-grabbing rounded p-0.5 -m-0.5 text-muted-foreground hover:bg-muted/50 hover:text-foreground select-none"
                      role="button"
                      aria-label={`Drag to reorder stop ${index + 1}`}
                    >
                      <GripVertical className="h-4 w-4 shrink-0 pointer-events-none" />
                    </div>
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                      {index + 1}
                    </div>
                    <div
                      className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md border border-border cursor-move"
                      onClick={() => setActiveStopIndex(index)}
                    >
                      <Image
                        src={stop.place.coverImage}
                        alt=""
                        fill
                        sizes="40px"
                        className="object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{stop.place.name}</p>
                      <Input
                        value={stop.note ?? ""}
                        onChange={(e) => handleUpdateStopNote(stop.id, e.target.value)}
                        placeholder="Note (optional)"
                        className="mt-0.5 h-7 border-0 bg-transparent px-0 text-xs text-muted-foreground placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRemoveStop(stop.id)
                      }}
                      aria-label={`Remove ${stop.place.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {step === "visualize" && (
          <div className="mx-auto max-w-lg space-y-6 pt-8">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Ready to go</h1>
            <p className="text-sm text-muted-foreground">Review and create your tour.</p>

            {/* Mini map (nav-map style) + summary cards */}
            {resolvedStops.length > 0 && selectedCity && (
              <div className="space-y-3">
                <div className="aspect-square w-full overflow-hidden rounded-xl border border-border bg-background shadow-sm ring-1 ring-black/5">
                  <div className="h-full w-full">
                    <MapProvider>
                      <MapContainer
                        id="tour-visualize-minimap"
                        mapKey="tour-visualize-minimap"
                        defaultCenter={{ lat: selectedCity.lat, lng: selectedCity.lng }}
                        defaultZoom={12}
                        minZoom={10}
                        maxZoom={14}
                        interactive={false}
                        controls={{ zoom: false, fullscreen: false }}
                        className="h-full w-full"
                      >
                        {resolvedStops.map((stop) => (
                          <MapMarker
                            key={stop.id}
                            position={{ lat: stop.place.lat, lng: stop.place.lng }}
                            title={stop.place.name}
                          >
                            <div className="h-1.5 w-1.5 rounded-full bg-red-500 shadow-sm" />
                          </MapMarker>
                        ))}
                        {resolvedStops.length >= 2 && (
                          <MapPolyline
                            path={resolvedStops.map((s) => ({ lat: s.place.lat, lng: s.place.lng }))}
                            color="#ef4444"
                            opacity={0.8}
                            weight={2}
                          />
                        )}
                      </MapContainer>
                    </MapProvider>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground">
                    {resolvedStops.length} {resolvedStops.length === 1 ? "stop" : "stops"}
                  </span>
                  <span className="rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground">
                    {routeMetrics.totalDistanceKm.toFixed(1)} km
                  </span>
                </div>
              </div>
            )}

            <div className="rounded-2xl border-2 border-border bg-card p-4 space-y-3">
              <p className="font-semibold text-foreground">{tourName.trim() || "Untitled Tour"}</p>
              {tourDescription.trim() && (
                <p className="text-sm text-muted-foreground">{tourDescription}</p>
              )}
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground">
                  {selectedCityName}
                </span>
                <span className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground">
                  {resolvedStops.length} stops
                </span>
              </div>
              <div className="border-t border-border pt-3">
                <p className="text-xs font-medium text-muted-foreground mb-2">Stops</p>
                <ol className="space-y-1.5 text-sm text-foreground">
                  {resolvedStops.map((stop, i) => (
                    <li key={stop.id}>
                      {i + 1}. {stop.place.name}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
            <Button
              type="button"
              className="w-full"
              size="lg"
              onClick={handleSaveTour}
            >
              Create tour
            </Button>
            {lastSavedSlug && (
              <div className="rounded-xl border border-border bg-muted/50 p-4 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Share link</p>
                <p className="truncate text-sm text-foreground">
                  {typeof window !== "undefined" ? `${window.location.origin}/tours/${lastSavedSlug}` : ""}
                </p>
                <Button type="button" variant="outline" size="sm" onClick={handleCopyLink} className="w-full">
                  <Copy className="mr-2 h-4 w-4" />
                  {copied ? "Copied" : "Copy link"}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="mx-auto w-full max-w-2xl flex-1 min-h-0 flex flex-col">
        {stepContent}
      </div>
      {notice && (
        <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-full bg-card border border-border px-4 py-2 text-sm shadow-lg">
          {notice}
        </div>
      )}
    </div>
  )
}
