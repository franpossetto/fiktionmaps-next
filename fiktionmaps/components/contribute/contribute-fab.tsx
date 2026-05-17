"use client"

import { Plus } from "lucide-react"
import { useTranslations } from "next-intl"
import { Link, usePathname } from "@/i18n/navigation"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function ContributeFab() {
  const pathname = usePathname()
  const t = useTranslations("Contribute.fab")

  if (pathname != null && /(^|\/)contribute(\/|$)/.test(pathname)) {
    return null
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          size="icon"
          variant="default"
          className="pointer-events-auto h-11 w-11 rounded-full border border-border shadow-lg"
          aria-label={t("button")}
        >
          <Plus className="h-5 w-5" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="min-w-[10rem]">
        <DropdownMenuItem asChild>
          <Link href="/contribute/fiction" className="cursor-pointer">
            {t("addFiction")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/contribute/place" className="cursor-pointer">
            {t("addPlace")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/contribute/scene" className="cursor-pointer">
            {t("addScene")}
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
