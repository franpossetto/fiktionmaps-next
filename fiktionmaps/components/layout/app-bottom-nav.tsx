"use client"

import { Map, Clapperboard, Film, LayoutGrid, User, Settings } from "lucide-react"
import { cn } from "@/lib/utils"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/context/auth-context"

const navItems: { id: string; href: string; label: string; icon: React.ElementType }[] = [
  { id: "map", href: "/map", label: "Map", icon: Map },
  { id: "fictions", href: "/fictions", label: "Fictions", icon: Film },
  { id: "scenes", href: "/scenes", label: "Scenes", icon: Clapperboard },
  { id: "settings", href: "/settings", label: "Settings", icon: Settings },
  { id: "profile", href: "/profile", label: "Profile", icon: User },
  { id: "admin", href: "/admin", label: "Admin", icon: LayoutGrid },
]

export function AppBottomNav() {
  const pathname = usePathname()
  const { user } = useAuth()

  const visibleNavItems = !user
    ? [
        ...navItems.filter(
          (item) => item.id !== "admin" && item.id !== "profile" && item.id !== "settings",
        ),
        { id: "login", href: "/login", label: "Login", icon: User },
      ]
    : navItems

  const isActive = (href: string) => pathname?.startsWith(href)

  return (
    <div className="flex h-[70px] items-center justify-between px-2 py-3">
      <Link
        href="/map"
        className="flex h-12 w-12 items-center justify-center rounded-lg transition-transform hover:scale-110 active:scale-95 flex-shrink-0"
        aria-label="FiktionMaps home"
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
              aria-label={item.label}
              title={item.label}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium mt-0.5">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="w-12 flex-shrink-0" />
    </div>
  )
}
