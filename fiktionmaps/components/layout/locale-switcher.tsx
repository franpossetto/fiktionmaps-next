"use client"

import { useLocale, useTranslations } from "next-intl"
import { usePathname } from "@/i18n/navigation"
import { routing } from "@/i18n/routing"
import { Languages } from "lucide-react"
import {
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu"

function localeLabel(loc: string, t: (key: "english" | "spanish") => string) {
  return loc === "en" ? t("english") : t("spanish")
}

function useLocaleSwitchPath() {
  const locale = useLocale()
  const pathname = usePathname()
  const path = pathname || "/login"

  const switchTo = (newLocale: string) => {
    if (newLocale && newLocale !== locale) {
      window.location.href = `/${newLocale}${path}`
    }
  }

  return { locale, switchTo }
}

/** Language submenu for profile / nav dropdowns (opens to the side). */
export function LocaleMenuSub() {
  const t = useTranslations("Common")
  const { locale, switchTo } = useLocaleSwitchPath()

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger className="text-foreground focus:bg-accent focus:text-accent-foreground">
        <Languages className="mr-2 h-4 w-4" />
        {t("language")}
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent
        sideOffset={4}
        className="z-[1100] min-w-[10rem] bg-background text-foreground border border-border shadow-xl"
      >
        <DropdownMenuRadioGroup value={locale} onValueChange={switchTo}>
          {routing.locales.map((loc) => (
            <DropdownMenuRadioItem
              key={loc}
              value={loc}
              className="text-foreground focus:bg-accent focus:text-accent-foreground"
            >
              {localeLabel(loc, t)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  )
}

/** Small language select for auth pages. */
export function LocaleSwitcher() {
  const t = useTranslations("Common")
  const { locale, switchTo } = useLocaleSwitchPath()

  return (
    <div className="mt-6 flex flex-col items-center gap-1.5">
      <label htmlFor="locale-select" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {t("language")}
      </label>
      <select
        id="locale-select"
        value={locale}
        onChange={(e) => switchTo(e.target.value)}
        className="h-8 min-w-28 rounded-md border border-border bg-background px-2.5 text-sm text-foreground outline-none transition-colors focus:ring-2 focus:ring-ring"
        aria-label={t("language")}
      >
        {routing.locales.map((loc) => (
          <option key={loc} value={loc}>
            {localeLabel(loc, t)}
          </option>
        ))}
      </select>
    </div>
  )
}
