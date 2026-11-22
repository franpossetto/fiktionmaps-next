"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { Bed, ChevronDown, ChevronUp, ExternalLink, Loader2, MapPin, Search, X } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { WishlistCityMapLazy } from "@/components/profile/wishlist-city-map-lazy"
import {
  useWishlistCitySelection,
  type WishlistExplorerItem,
  type WishlistStay,
  type WishlistTourItem,
} from "@/components/profile/wishlist-city-selection"
import {
  reverseStayAddress,
  searchStayAddresses,
  type StayPrediction,
} from "@/components/profile/wishlist-stay-search"
import { DEFAULT_FICTION_COVER } from "@/lib/constants/placeholders"
import { cn } from "@/lib/utils"
import type { WishlistMapPin } from "./wishlist-city-map"

export type { WishlistExplorerItem }

function formatKm(km: number, locale: string): string {
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1, minimumFractionDigits: 0 }).format(km)} km`
}

function toPins(tour: WishlistTourItem[]): WishlistMapPin[] {
  return tour
    .filter((stop) => stop.item.lat != null && stop.item.lng != null)
    .map((stop, index) => ({
      id: stop.item.placeId,
      name: stop.item.placeName,
      image: stop.item.placeImage,
      href: stop.item.href,
      lat: stop.item.lat as number,
      lng: stop.item.lng as number,
      stop: index + 1,
      far: stop.far,
    }))
}

function WishlistStayOverlay() {
  const t = useTranslations("Profile")
  const {
    stay,
    setStay,
    stayProximity,
    pickingStay,
    setPickingStay,
  } = useWishlistCitySelection()
  const [editing, setEditing] = useState(false)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<StayPrediction[]>([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const stayAtEdit = useRef(stay)

  function closeEditor() {
    setEditing(false)
    setQuery("")
    setResults([])
    setLoading(false)
    setPickingStay(false)
  }

  function startEdit() {
    stayAtEdit.current = stay
    setEditing(true)
  }

  function applyStay(next: WishlistStay) {
    setStay(next)
    closeEditor()
  }

  useEffect(() => {
    if (!editing) return
    inputRef.current?.focus()
  }, [editing])

  useEffect(() => {
    if (!editing || stay === stayAtEdit.current) return
    closeEditor()
  }, [editing, stay])

  useEffect(() => {
    if (!editing || pickingStay) return
    const q = query.trim()
    if (q.length < 3) {
      setResults([])
      setLoading(false)
      return
    }
    const handle = window.setTimeout(() => {
      setLoading(true)
      void searchStayAddresses(q, stayProximity)
        .then((rows) => setResults(rows))
        .catch(() => setResults([]))
        .finally(() => setLoading(false))
    }, 280)
    return () => window.clearTimeout(handle)
  }, [editing, pickingStay, query, stayProximity])

  if (!editing) {
    return (
      <div className="pointer-events-auto flex max-w-[min(100%,22rem)] items-center gap-1">
        <button
          type="button"
          onClick={startEdit}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-border/60 bg-background/95 px-3 py-2 text-left text-sm shadow-md hover:bg-muted"
        >
          <Bed className="h-4 w-4 shrink-0 text-yellow-600" aria-hidden />
          {stay ? (
            <span className="min-w-0 truncate font-medium text-foreground">{stay.label}</span>
          ) : (
            <span className="min-w-0 font-medium text-foreground">{t("wishlistStayAdd")}</span>
          )}
        </button>
        {stay ? (
          <button
            type="button"
            onClick={() => setStay(null)}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-background/95 text-muted-foreground shadow-md hover:bg-muted hover:text-foreground"
            aria-label={t("wishlistStayClear")}
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    )
  }

  return (
    <div className="pointer-events-auto w-full max-w-[min(100%,26rem)]">
      <div className="flex items-center gap-1">
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-border/60 bg-background/95 px-3 py-2 shadow-md">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              if (pickingStay) setPickingStay(false)
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") closeEditor()
            }}
            placeholder={t("wishlistStaySearchPlaceholder")}
            className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>
        <button
          type="button"
          onClick={() => setPickingStay(!pickingStay)}
          className={cn(
            "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border shadow-md",
            pickingStay
              ? "border-yellow-400 bg-yellow-400 text-black"
              : "border-border/60 bg-background/95 text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
          aria-pressed={pickingStay}
          aria-label={t("wishlistStayMark")}
          title={t("wishlistStayMark")}
        >
          <MapPin className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={closeEditor}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-background/95 text-muted-foreground shadow-md hover:bg-muted hover:text-foreground"
          aria-label={t("wishlistStayCancel")}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {query.trim().length > 0 && query.trim().length < 3 ? (
        <p className="mt-1.5 rounded-md border border-border/60 bg-background/95 px-2.5 py-1.5 text-xs text-muted-foreground shadow-md">
          {t("wishlistStaySearchHint")}
        </p>
      ) : loading ? (
        <p className="mt-1.5 flex items-center gap-2 rounded-md border border-border/60 bg-background/95 px-2.5 py-1.5 text-xs text-muted-foreground shadow-md">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          {t("wishlistStaySearching")}
        </p>
      ) : results.length > 0 ? (
        <ul className="mt-1.5 max-h-56 overflow-y-auto rounded-lg border border-border/60 bg-background/95 py-1 shadow-md">
          {results.map((row) => (
            <li key={row.id}>
              <button
                type="button"
                onClick={() => applyStay({ label: row.label, lat: row.lat, lng: row.lng })}
                className="flex w-full items-start gap-2 px-2.5 py-2 text-left text-sm hover:bg-muted"
              >
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                <span className="min-w-0 leading-snug text-foreground">{row.label}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : query.trim().length >= 3 ? (
        <p className="mt-1.5 rounded-md border border-border/60 bg-background/95 px-2.5 py-1.5 text-xs text-muted-foreground shadow-md">
          {t("wishlistStaySearchEmpty")}
        </p>
      ) : null}
    </div>
  )
}

export function WishlistCityMapSection({ mapInstanceId }: { mapInstanceId: string }) {
  const t = useTranslations("Profile")
  const { selectedId, stay, setStay, tour, pickingStay, setPickingStay } = useWishlistCitySelection()
  const pins = toPins(tour)

  return (
    <section aria-label={t("wishlistMapHeading")}>
      {pins.length > 0 ? (
        <WishlistCityMapLazy
          mapInstanceId={mapInstanceId}
          pins={pins}
          selectedId={selectedId}
          stay={stay}
          pickingStay={pickingStay}
          overlay={<WishlistStayOverlay />}
          onMapClick={
            pickingStay
              ? (pos) => {
                  void reverseStayAddress(pos.lat, pos.lng)
                    .then((label) =>
                      setStay({
                        label: label || t("wishlistStayPinned"),
                        lat: pos.lat,
                        lng: pos.lng,
                      }),
                    )
                    .finally(() => setPickingStay(false))
                }
              : undefined
          }
        />
      ) : (
        <p className="text-sm text-muted-foreground">{t("wishlistMapEmpty")}</p>
      )}
    </section>
  )
}

function TourPlaceRow({
  stop,
  index,
  selected,
  canFocus,
  onSelect,
}: {
  stop: WishlistTourItem
  index: number
  selected: boolean
  canFocus: boolean
  onSelect: () => void
}) {
  const t = useTranslations("Profile")
  const locale = useLocale()
  const item = stop.item
  const kmLabel =
    stop.kmFromStay != null ? t("wishlistStayFarHint", { km: formatKm(stop.kmFromStay, locale) }) : null

  return (
    <li>
      <div className={cn("flex items-center gap-2 px-2 py-2", selected && "bg-muted/70")}>
        <button
          type="button"
          disabled={!canFocus}
          onClick={onSelect}
          className={cn(
            "flex min-w-0 flex-1 items-center gap-2.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring",
            canFocus ? "cursor-pointer" : "cursor-default",
          )}
        >
          <span
            className={cn(
              "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold tabular-nums",
              selected
                ? "bg-yellow-500 text-black"
                : stop.far
                  ? "bg-amber-700 text-white"
                  : "bg-muted text-muted-foreground",
            )}
          >
            {index + 1}
          </span>
          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md border border-border/60 bg-muted/30">
            <Image
              src={item.placeImage?.trim() || DEFAULT_FICTION_COVER}
              alt=""
              fill
              className="object-cover"
              sizes="40px"
            />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{item.placeName}</p>
            {item.fictionTitle ? (
              <p className="truncate text-xs text-muted-foreground">{item.fictionTitle}</p>
            ) : null}
            {stop.far && kmLabel ? (
              <p className="truncate text-xs text-amber-700 dark:text-amber-400">
                {t("wishlistStayFar")} · {kmLabel}
              </p>
            ) : kmLabel ? (
              <p className="truncate text-xs text-muted-foreground">{kmLabel}</p>
            ) : null}
          </div>
        </button>
        <Link
          href={item.href}
          title={t("wishlistOpenPlace")}
          aria-label={t("wishlistOpenPlace")}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>
    </li>
  )
}

export function WishlistCityPlacesList() {
  const t = useTranslations("Profile")
  const { selectedId, setSelectedId, stay, tour } = useWishlistCitySelection()
  const nearby = tour.filter((stop) => !stop.tooFar)
  const far = tour.filter((stop) => stop.tooFar)
  const focusable = tour.filter((stop) => stop.item.lat != null && stop.item.lng != null)
  const selectedIndex = focusable.findIndex((stop) => stop.item.placeId === selectedId)

  function step(delta: number) {
    if (focusable.length === 0) return
    const from = selectedIndex < 0 ? (delta > 0 ? -1 : 0) : selectedIndex
    const next = (from + delta + focusable.length) % focusable.length
    setSelectedId(focusable[next]!.item.placeId)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-border/60 bg-card/40">
      <div className="flex items-center gap-2 border-b border-border/60 px-3 py-3">
        <span className="h-5 w-1 shrink-0 rounded-full bg-yellow-500" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">{t("wishlistTourHeading")}</p>
          <p className="text-xs text-muted-foreground">
            {stay ? t("wishlistTourHintFromStay") : t("wishlistTourHint")}
          </p>
        </div>
        {focusable.length > 1 ? (
          <div className="flex shrink-0 items-center gap-0.5">
            <button
              type="button"
              onClick={() => step(-1)}
              className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label={t("wishlistTourPrev")}
            >
              <ChevronUp className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => step(1)}
              className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label={t("wishlistTourNext")}
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
        ) : null}
      </div>
      <ol className="min-h-0 flex-1 divide-y divide-border/50 overflow-y-auto">
        {nearby.map((stop, index) => {
          const canFocus = stop.item.lat != null && stop.item.lng != null
          return (
            <TourPlaceRow
              key={stop.item.placeId}
              stop={stop}
              index={index}
              selected={stop.item.placeId === selectedId}
              canFocus={canFocus}
              onSelect={() => canFocus && setSelectedId(stop.item.placeId)}
            />
          )
        })}
        {far.length > 0 ? (
          <li className="bg-amber-500/10 px-3 py-2">
            <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
              {t("wishlistStayTooFarHeading")}
            </p>
            <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80">{t("wishlistStayTooFarHint")}</p>
          </li>
        ) : null}
        {far.map((stop, index) => {
          const canFocus = stop.item.lat != null && stop.item.lng != null
          return (
            <TourPlaceRow
              key={stop.item.placeId}
              stop={stop}
              index={nearby.length + index}
              selected={stop.item.placeId === selectedId}
              canFocus={canFocus}
              onSelect={() => canFocus && setSelectedId(stop.item.placeId)}
            />
          )
        })}
      </ol>
    </div>
  )
}
