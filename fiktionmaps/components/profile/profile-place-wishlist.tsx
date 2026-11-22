"use client"

import { useMemo, useState } from "react"
import { ImageOff } from "lucide-react"
import Image from "next/image"
import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { DEFAULT_FICTION_COVER } from "@/lib/constants/placeholders"
import { publicFictionPlacePath } from "@/lib/fictions/public-fiction-paths"
import type { PlaceWishlistItem } from "@/src/place-wishlists/domain/place-wishlist.entity"
import { listSuggestedPlacesForWishlistAction } from "@/src/place-wishlists/infrastructure/next/place-wishlist.actions"
import type { SuggestedPlace } from "@/src/places/domain/suggested-place.entity"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { userWishlistPath } from "@/lib/users/user-wishlist-path"
import { PlacesSidebarRow } from "./profile-sidebar-sections"

type WishlistCityGroup = {
  key: string
  cityName: string | null
  citySlug: string | null
  cityImage: string | null
  items: PlaceWishlistItem[]
}

function groupWishlistByCity(items: PlaceWishlistItem[]): WishlistCityGroup[] {
  const groups = new Map<string, WishlistCityGroup>()
  for (const item of items) {
    const key = item.cityId ?? `name:${item.cityName?.trim() || "unknown"}`
    const existing = groups.get(key)
    if (existing) {
      existing.items.push(item)
      continue
    }
    groups.set(key, {
      key,
      cityName: item.cityName,
      citySlug: item.citySlug,
      cityImage: item.cityImage,
      items: [item],
    })
  }
  return [...groups.values()]
}

function PlaceCardLink({
  href,
  title,
  subtitle,
  image,
  onNavigate,
}: {
  href: string
  title: string
  subtitle: string | null
  image: string | null
  onNavigate?: () => void
}) {
  const thumb = image?.trim() || DEFAULT_FICTION_COVER
  return (
    <Link href={href} className="block transition-colors hover:bg-muted/40" onClick={onNavigate}>
      <PlacesSidebarRow
        leading={<Image src={thumb} alt="" fill className="object-cover" sizes="40px" />}
        title={title}
        subtitle={subtitle}
      />
    </Link>
  )
}

export function ProfilePlaceWishlist({
  items,
  username,
}: {
  items: PlaceWishlistItem[]
  username?: string | null
}) {
  const t = useTranslations("Profile")
  const [suggestOpen, setSuggestOpen] = useState(false)
  const [cityOpen, setCityOpen] = useState<WishlistCityGroup | null>(null)
  const [suggestions, setSuggestions] = useState<SuggestedPlace[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const cityGroups = useMemo(() => groupWishlistByCity(items), [items])

  async function openSuggestions() {
    setSuggestOpen(true)
    if (suggestions || loading) return
    setLoading(true)
    setError(false)
    const res = await listSuggestedPlacesForWishlistAction()
    if (res.success) {
      setSuggestions(res.items)
    } else {
      setError(true)
    }
    setLoading(false)
  }

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {t("wishlistHeading")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("wishlistSubtitle")}</p>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-border/50 bg-card/30 px-4 py-5">
          <p className="text-sm text-muted-foreground">{t("wishlistEmpty")}</p>
          <button
            type="button"
            onClick={() => void openSuggestions()}
            className="mt-2 text-sm font-medium text-foreground underline-offset-4 hover:text-primary hover:underline"
          >
            {t("wishlistEmptyCta")}
          </button>
        </div>
      ) : (
        <ul className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1 [scrollbar-width:thin]">
          {cityGroups.map((group) => {
            const title = group.cityName?.trim() || t("unknownCity")
            const photo = group.cityImage?.trim() || null
            return (
              <li key={group.key} className="w-[132px] shrink-0 sm:w-[148px]">
                {username ? (
                <Link
                  href={userWishlistPath(username, group.citySlug ?? "unknown")}
                  className="group block w-full text-left"
                >
                  <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border border-border/50 bg-muted">
                    {photo ? (
                      <Image
                        src={photo}
                        alt=""
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        sizes="148px"
                      />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center gap-1 px-2 text-muted-foreground/50">
                        <ImageOff className="h-5 w-5" aria-hidden />
                        <p className="text-center text-[10px] leading-tight">{t("wishlistCityNoPhoto")}</p>
                      </div>
                    )}
                  </div>
                  <p className="mt-1.5 truncate text-[13px] font-medium leading-snug text-foreground group-hover:text-primary">
                    {title}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {t("wishlistCityPlaces", { count: group.items.length })}
                  </p>
                </Link>
                ) : (
                <button
                  type="button"
                  onClick={() => setCityOpen(group)}
                  className="group block w-full text-left"
                >
                  <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border border-border/50 bg-muted">
                    {photo ? (
                      <Image
                        src={photo}
                        alt=""
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        sizes="148px"
                      />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center gap-1 px-2 text-muted-foreground/50">
                        <ImageOff className="h-5 w-5" aria-hidden />
                        <p className="text-center text-[10px] leading-tight">{t("wishlistCityNoPhoto")}</p>
                      </div>
                    )}
                  </div>
                  <p className="mt-1.5 truncate text-[13px] font-medium leading-snug text-foreground group-hover:text-primary">
                    {title}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {t("wishlistCityPlaces", { count: group.items.length })}
                  </p>
                </button>
                )}
              </li>
            )
          })}
        </ul>
      )}

      <Dialog open={cityOpen !== null} onOpenChange={(open) => !open && setCityOpen(null)}>
        <DialogContent className="flex max-h-[min(80vh,640px)] max-w-md flex-col gap-4 overflow-hidden">
          <DialogHeader>
            <DialogTitle>{cityOpen?.cityName?.trim() || t("unknownCity")}</DialogTitle>
            <DialogDescription>
              {cityOpen
                ? t("wishlistCityPlaces", { count: cityOpen.items.length })
                : t("wishlistSubtitle")}
            </DialogDescription>
          </DialogHeader>
          {cityOpen?.citySlug ? (
            <Link
              href={`/cities/${cityOpen.citySlug}`}
              className="text-sm font-medium text-foreground underline-offset-4 hover:text-primary hover:underline"
              onClick={() => setCityOpen(null)}
            >
              {t("wishlistCityOpen")}
            </Link>
          ) : null}
          <ul className="min-h-0 flex-1 divide-y divide-border/50 overflow-y-auto rounded-xl border border-border/50 bg-card/30">
            {(cityOpen?.items ?? []).map((item) => {
              const href =
                item.fictionSlug && item.placeSlug
                  ? publicFictionPlacePath(item.fictionSlug, item.placeSlug)
                  : "/fictions"
              const subtitle = item.fictionTitle?.trim() || null
              return (
                <li key={item.placeId}>
                  <PlaceCardLink
                    href={href}
                    title={item.placeName}
                    subtitle={subtitle}
                    image={item.placeImage}
                    onNavigate={() => setCityOpen(null)}
                  />
                </li>
              )
            })}
          </ul>
        </DialogContent>
      </Dialog>

      <Dialog open={suggestOpen} onOpenChange={setSuggestOpen}>
        <DialogContent className="flex max-h-[min(80vh,640px)] max-w-md flex-col gap-4 overflow-hidden">
          <DialogHeader>
            <DialogTitle>{t("wishlistSuggestTitle")}</DialogTitle>
            <DialogDescription>{t("wishlistSuggestSubtitle")}</DialogDescription>
          </DialogHeader>

          {loading ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {t("wishlistSuggestLoading")}
            </p>
          ) : error ? (
            <div className="py-6 text-center">
              <p className="text-sm text-muted-foreground">{t("wishlistSuggestError")}</p>
              <button
                type="button"
                onClick={() => {
                  setSuggestions(null)
                  void openSuggestions()
                }}
                className="mt-2 text-sm font-medium text-foreground underline-offset-4 hover:text-primary hover:underline"
              >
                {t("wishlistEmptyCta")}
              </button>
            </div>
          ) : suggestions && suggestions.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {t("wishlistSuggestEmpty")}
            </p>
          ) : (
            <ul className="min-h-0 flex-1 divide-y divide-border/50 overflow-y-auto rounded-xl border border-border/50 bg-card/30">
              {(suggestions ?? []).map((item) => {
                const href =
                  item.fictionSlug && item.placeSlug
                    ? publicFictionPlacePath(item.fictionSlug, item.placeSlug)
                    : "/fictions"
                const subtitle = [item.fictionTitle, item.cityName].filter(Boolean).join(" · ")
                return (
                  <li key={item.placeId}>
                    <PlaceCardLink
                      href={href}
                      title={item.placeName}
                      subtitle={subtitle || null}
                      image={item.placeImage}
                      onNavigate={() => setSuggestOpen(false)}
                    />
                  </li>
                )
              })}
            </ul>
          )}
        </DialogContent>
      </Dialog>
    </section>
  )
}
