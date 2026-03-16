"use client"

import { Map, Clapperboard, Film, LayoutGrid, User, Settings } from "lucide-react"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"
import Image from "next/image"
import { Link, usePathname } from "@/i18n/navigation"
import { useAuth } from "@/context/auth-context"

type NavKey = "map" | "fictions" | "scenes" | "settings" | "profile" | "admin" | "login"

const navItems: { id: string; href: string; labelKey: NavKey; icon: React.ElementType }[] = [
  { id: "map", href: "/map", labelKey: "map", icon: Map },
  { id: "fictions", href: "/fictions", labelKey: "fictions", icon: Film },
  { id: "scenes", href: "/scenes", labelKey: "scenes", icon: Clapperboard },
  { id: "settings", href: "/settings", labelKey: "settings", icon: Settings },
  { id: "profile", href: "/profile", labelKey: "profile", icon: User },
  { id: "admin", href: "/admin", labelKey: "admin", icon: LayoutGrid },
]

export function AppBottomNav() {
  const t = useTranslations("Nav")
  const pathname = usePathname()
  const { user } = useAuth()

  const visibleNavItems = !user
    ? [
        ...navItems.filter(
          (item) => item.id !== "admin" && item.id !== "profile" && item.id !== "settings",
        ),
        { id: "login", href: "/login", labelKey: "login" as NavKey, icon: User },
      ]
    : navItems

  const isActive = (href: string) => pathname?.startsWith(href)

  return (
    <div className="flex h-[70px] items-center justify-between px-2 py-3">
      <Link
        href="/map"
        className="flex h-12 w-12 items-center justify-center rounded-lg transition-transform hover:scale-110 active:scale-95 flex-shrink-0"
        aria-label={t("homeLabel")}
      >
        <Image
          src="/logo-icon.png"
          alt="FiktionMaps"
          width={28}
          height={28}
          loading="eager"
          className="h-7 w-auto drop-shadow-lg"
        />
      </Link>

      <nav className="flex-1 flex items-center justify-center gap-1 px-2">
        {visibleNavItems.map((item) => {
          const active = isActive(item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center min-h-[52px] min-w-[52px] rounded-lg transition-all duration-200 flex-shrink-0",
                active
                  ? "bg-chrome-active text-foreground shadow-[inset_0_0_0_1px_hsl(var(--chrome-border))]"
                  : "text-chrome-muted hover:bg-chrome-hover hover:text-foreground",
              )}
              aria-label={t(item.labelKey)}
              title={t(item.labelKey)}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium mt-0.5">{t(item.labelKey)}</span>
            </Link>
          )
        })}
      </nav>

      <div className="w-12 flex-shrink-0" />
    </div>
  )
}
