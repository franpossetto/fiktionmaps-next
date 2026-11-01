"use client"

import { useState, type ReactNode } from "react"
import { Bookmark } from "lucide-react"
import { useTranslations } from "next-intl"
import { usePathname } from "@/i18n/navigation"
import { Link } from "@/i18n/navigation"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/auth-context"
import { togglePlaceWishlistAction } from "@/src/place-wishlists/infrastructure/next/place-wishlist.actions"
import { cn } from "@/lib/utils"

export function PlaceWishlistToggle({
  placeId,
  initialWishlisted = false,
  variant = "button",
}: {
  placeId: string
  initialWishlisted?: boolean
  variant?: "button" | "icon"
}) {
  const t = useTranslations("Fictions")
  const pathname = usePathname()
  const { user, isAuthReady } = useAuth()
  const [wishlisted, setWishlisted] = useState(initialWishlisted)
  const [busy, setBusy] = useState(false)

  const loginHref = `/login?next=${encodeURIComponent(pathname)}`
  const label = wishlisted ? t("placeWishlistOnMyList") : t("placeWishlistWantToVisit")
  const isIcon = variant === "icon"

  async function handleToggle() {
    if (!user || busy) return
    const previous = wishlisted
    setBusy(true)
    setWishlisted(!previous)
    try {
      const result = await togglePlaceWishlistAction(placeId)
      if (!result.success) {
        setWishlisted(previous)
        return
      }
      setWishlisted(result.wishlisted)
    } catch {
      setWishlisted(previous)
    } finally {
      setBusy(false)
    }
  }

  const icon = <Bookmark className="h-4 w-4" fill={wishlisted ? "currentColor" : "none"} />

  if (isAuthReady && !user) {
    if (isIcon) {
      return (
        <HoverHint label={t("placeWishlistWantToVisit")}>
          <Button asChild size="sm" variant="secondary" className="h-9 w-9 p-0">
            <Link href={loginHref} aria-label={t("placeWishlistWantToVisit")}>
              <Bookmark className="h-4 w-4" />
            </Link>
          </Button>
        </HoverHint>
      )
    }
    return (
      <Button asChild size="sm" variant="outline" className="h-9 shrink-0 border-border bg-background px-3 text-sm shadow-none">
        <Link href={loginHref}>
          <Bookmark className="h-4 w-4" />
          <span>{t("placeWishlistWantToVisit")}</span>
        </Link>
      </Button>
    )
  }

  if (isIcon) {
    return (
      <HoverHint label={label}>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="h-9 w-9 p-0"
          onClick={handleToggle}
          disabled={!isAuthReady || busy}
          aria-pressed={wishlisted}
          aria-label={label}
        >
          {icon}
        </Button>
      </HoverHint>
    )
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className="h-9 shrink-0 border-border bg-background px-3 text-sm shadow-none"
      onClick={handleToggle}
      disabled={!isAuthReady || busy}
      aria-pressed={wishlisted}
      aria-label={label}
    >
      {icon}
      <span>{label}</span>
    </Button>
  )
}

function HoverHint({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="group/wishlist relative inline-flex">
      {children}
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute bottom-full left-1/2 z-20 mb-1.5 -translate-x-1/2",
          "whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-[11px] font-medium text-background shadow-sm",
          "opacity-0 transition-opacity group-hover/wishlist:opacity-100 group-focus-within/wishlist:opacity-100",
        )}
      >
        {label}
      </span>
    </span>
  )
}
