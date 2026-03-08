"use client"

import { useState } from "react"
import {
  Map,
  Clapperboard,
  Settings,
  CheckCircle2,
  Film,
  LayoutGrid,
  User,
  Route,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { UserMenu } from "@/components/layout/user-menu"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/lib/auth-context"

export type AppView = "map" | "scenes" | "fictions" | "admin" | "profile"

const navItems: { id: AppView; href: string; label: string; icon: React.ElementType }[] = [
  { id: "map", href: "/map", label: "Map", icon: Map },
  { id: "fictions", href: "/fictions", label: "Fictions", icon: Film },
  { id: "scenes", href: "/scenes", label: "Scenes", icon: Clapperboard },
  { id: "admin", href: "/admin", label: "Admin", icon: LayoutGrid },
]

export function AppSidebar() {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)
  const pathname = usePathname()
  const { user } = useAuth()

  const visibleNavItems = !user
    ? navItems.filter((item) => item.id !== "admin")
    : navItems

  const isActive = (href: string) => pathname?.startsWith(href)

  return (
    <aside className="relative z-[999] flex h-full w-[60px] shrink-0 flex-col items-center bg-chrome py-4">
      <Link
        href="/map"
        className="group mb-6 flex h-10 w-10 items-center justify-center rounded-xl transition-transform hover:scale-110 active:scale-95"
        aria-label="FiktionMaps home"
      >
        <Image
          src="/logo-icon.png"
          alt="FiktionMaps"
          width={34}
          height={34}
          loading="eager"
          className="h-[34px] w-auto drop-shadow-lg"
        />
      </Link>

      <nav className="flex flex-col items-center gap-1">
        {visibleNavItems.map((item) => {
          const active = isActive(item.href)
          const isHovered = hoveredItem === item.id
          return (
            <div key={item.id} className="relative">
              <Link
                href={item.href}
                onMouseEnter={() => setHoveredItem(item.id)}
                onMouseLeave={() => setHoveredItem(null)}
                className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-xl transition-all duration-200",
                  active
                    ? "bg-chrome-active text-foreground shadow-[inset_0_0_0_1px_hsl(var(--chrome-border))]"
                    : "text-chrome-muted hover:bg-chrome-hover hover:text-foreground",
                )}
                aria-label={item.label}
              >
                <item.icon className="h-[20px] w-[20px]" />
              </Link>
              {active && (
                <div className="absolute -left-[14px] top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary" />
              )}
              {isHovered && (
                <div className="absolute left-[52px] top-1/2 -translate-y-1/2 rounded-md bg-chrome-tooltip px-2.5 py-1 text-xs font-medium text-foreground shadow-lg whitespace-nowrap z-50 border border-chrome-border">
                  {item.label}
                </div>
              )}
            </div>
          )
        })}
        <div className="relative">
          <Link
            href="/tours"
            onMouseEnter={() => setHoveredItem("Tours")}
            onMouseLeave={() => setHoveredItem(null)}
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-xl transition-all duration-200",
              isActive("/tours")
                ? "bg-chrome-active text-foreground shadow-[inset_0_0_0_1px_hsl(var(--chrome-border))]"
                : "text-chrome-muted hover:bg-chrome-hover hover:text-foreground",
            )}
            aria-label="Tours"
            title="Tours"
          >
            <Route className="h-[20px] w-[20px]" />
          </Link>
          {isActive("/tours") && (
            <div className="absolute -left-[14px] top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary" />
          )}
          {hoveredItem === "Tours" && (
            <div className="absolute left-[52px] top-1/2 -translate-y-1/2 rounded-md bg-chrome-tooltip px-2.5 py-1 text-xs font-medium text-foreground shadow-lg whitespace-nowrap z-50 border border-chrome-border">
              Tours
            </div>
          )}
        </div>
      </nav>

      <div className="flex-1" />

      {!user ? (
        <div className="flex flex-col items-center gap-1 pb-2 w-full">
          <div className="border-t border-chrome-border w-full mt-2 pt-2 flex justify-center">
            <div className="relative">
              <Link
                href="/login"
                onMouseEnter={() => setHoveredItem("Login")}
                onMouseLeave={() => setHoveredItem(null)}
                className="flex h-10 w-10 items-center justify-center rounded-xl text-chrome-muted transition-all duration-200 hover:bg-chrome-hover hover:text-foreground"
                aria-label="Login"
              >
                <User className="h-[18px] w-[18px]" />
              </Link>
              {hoveredItem === "Login" && (
                <div className="absolute left-[48px] top-1/2 -translate-y-1/2 rounded-md bg-chrome-tooltip px-2.5 py-1 text-xs font-medium text-foreground shadow-lg whitespace-nowrap z-50 border border-chrome-border">
                  Login
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-1 pb-1">
          {[
            { icon: User, label: "Profile", href: "/profile" },
            { icon: Settings, label: "Settings", href: "/settings" },
            { icon: CheckCircle2, label: "Visited", href: "#" },
          ].map((item) => (
            <div key={item.label} className="relative">
              <Link
                href={item.href}
                onMouseEnter={() => setHoveredItem(item.label)}
                onMouseLeave={() => setHoveredItem(null)}
                className="flex h-10 w-10 items-center justify-center rounded-xl text-chrome-muted transition-all duration-200 hover:bg-chrome-hover hover:text-foreground"
                aria-label={item.label}
              >
                <item.icon className="h-[18px] w-[18px]" />
              </Link>
              {hoveredItem === item.label && (
                <div className="absolute left-[48px] top-1/2 -translate-y-1/2 rounded-md bg-chrome-tooltip px-2.5 py-1 text-xs font-medium text-foreground shadow-lg whitespace-nowrap z-50 border border-chrome-border">
                  {item.label}
                </div>
              )}
            </div>
          ))}

          <div className="border-t border-chrome-border w-full mt-2 pt-2">
            <UserMenu />
          </div>
        </div>
      )}
    </aside>
  )
}
