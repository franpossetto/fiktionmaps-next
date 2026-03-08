"use client"

import { useState } from "react"
import Image from "next/image"
import { useAuth } from "@/lib/auth-context"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { AuthModal } from "@/components/auth/auth-modal"
import { LogOut, User } from "lucide-react"

export function UserMenu() {
  const { user, logout } = useAuth()
  const [authOpen, setAuthOpen] = useState(false)

  if (!user) {
    return (
      <>
        <button
          onClick={() => setAuthOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-chrome-muted transition-all duration-200 hover:bg-chrome-hover hover:text-foreground mx-auto"
          aria-label="Sign in"
        >
          <User className="h-[18px] w-[18px]" />
        </button>
        <AuthModal open={authOpen} onOpenChange={setAuthOpen} />
      </>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200 hover:bg-chrome-hover mx-auto overflow-hidden"
          aria-label="User menu"
        >
          {user.avatar ? (
            <Image
              src={user.avatar}
              alt={user.name}
              width={28}
              height={28}
              className="rounded-full"
            />
          ) : (
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
              {user.name.charAt(0).toUpperCase()}
            </div>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="right" align="end" className="w-48">
        <DropdownMenuItem className="text-xs text-muted-foreground" disabled>
          {user.email}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={logout}>
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
