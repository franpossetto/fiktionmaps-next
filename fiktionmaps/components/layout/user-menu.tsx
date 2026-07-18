"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { useAuth } from "@/context/auth-context"
import { UserAvatar } from "@/components/ui/user-avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { AuthModal } from "@/components/auth/auth-modal"
import { LogOut, User, Settings, Shield, BookOpen, Map, Inbox, Plus, Sparkles } from "lucide-react"
import { Link } from "@/i18n/navigation"
import { LocaleMenuSub } from "@/components/layout/locale-switcher"
import { isHuntAvailableAction } from "@/src/hunts/infrastructure/next/hunt.actions"

export function UserMenu() {
  const t = useTranslations("Nav")
  const tHuntType = useTranslations("Contribute.hub.types.hunt_place")
  const { user, isAdmin, isStaffModerator, isContributor, logout } = useAuth()
  const [authOpen, setAuthOpen] = useState(false)
  const [huntAvailable, setHuntAvailable] = useState(false)

  useEffect(() => {
    if (!user || !isContributor) {
      setHuntAvailable(false)
      return
    }
    void isHuntAvailableAction().then(setHuntAvailable)
  }, [user, isContributor])

  if (!user) {
    return (
      <>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex h-10 w-10 items-center justify-center rounded-xl text-chrome-muted transition-all duration-200 hover:bg-chrome-hover hover:text-foreground mx-auto"
              aria-label={t("userMenu")}
            >
              <User className="h-[18px] w-[18px]" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="right"
            align="end"
            className="z-[1100] min-w-[240px] w-auto max-w-[min(320px,90vw)] bg-background text-foreground border border-border shadow-xl"
          >
            <DropdownMenuItem
              onClick={() => setAuthOpen(true)}
              className="text-foreground focus:bg-accent focus:text-accent-foreground"
            >
              <User className="mr-2 h-4 w-4" />
              {t("signIn")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <LocaleMenuSub />
          </DropdownMenuContent>
        </DropdownMenu>
        <AuthModal open={authOpen} onOpenChange={setAuthOpen} />
      </>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200 hover:bg-chrome-hover mx-auto overflow-hidden"
          aria-label={t("userMenu")}
        >
          <UserAvatar
            avatarId={user.avatar}
            fallback={user.name.charAt(0).toUpperCase()}
            className="h-7 w-7"
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side="right"
        align="end"
        className="z-[1100] min-w-[240px] w-auto max-w-[min(320px,90vw)] bg-background text-foreground border border-border shadow-xl"
      >
        <DropdownMenuItem className="text-xs text-muted-foreground cursor-default" disabled>
          {user.email}
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="text-foreground focus:bg-accent focus:text-accent-foreground">
          <Link href="/fictions">
            <BookOpen className="mr-2 h-4 w-4" />
            {t("catalog")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="text-foreground focus:bg-accent focus:text-accent-foreground">
          <Link href="/map">
            <Map className="mr-2 h-4 w-4" />
            {t("map")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="text-foreground focus:bg-accent focus:text-accent-foreground">
          <Link href="/settings">
            <Settings className="mr-2 h-4 w-4" />
            {t("settings")}
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild className="text-foreground focus:bg-accent focus:text-accent-foreground">
          <Link href="/profile">
            <User className="mr-2 h-4 w-4" />
            {t("profile")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="text-foreground focus:bg-accent focus:text-accent-foreground">
          <Link href="/profile/contribute">
            <Plus className="mr-2 h-4 w-4" />
            {t("contribute")}
          </Link>
        </DropdownMenuItem>
        {isStaffModerator && (
          <DropdownMenuItem asChild className="text-foreground focus:bg-accent focus:text-accent-foreground">
            <Link href="/contributions">
              <Inbox className="mr-2 h-4 w-4" />
              {t("contributions")}
            </Link>
          </DropdownMenuItem>
        )}
        {isAdmin && (
          <DropdownMenuItem asChild className="text-foreground focus:bg-accent focus:text-accent-foreground">
            <Link href="/admin">
              <Shield className="mr-2 h-4 w-4" />
              {t("admin")}
            </Link>
          </DropdownMenuItem>
        )}
        {isContributor && huntAvailable && (
          <DropdownMenuItem asChild className="text-foreground focus:bg-accent focus:text-accent-foreground">
            <Link href="/contribute/hunt">
              <Sparkles className="mr-2 h-4 w-4" />
              {tHuntType("title")}
            </Link>
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        <LocaleMenuSub />

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={logout} className="text-foreground focus:bg-accent focus:text-accent-foreground">
          <LogOut className="mr-2 h-4 w-4" />
          {t("signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
