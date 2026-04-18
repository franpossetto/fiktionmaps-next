"use client"

import { useLocale, useTranslations } from "next-intl"
import { usePathname } from "@/i18n/navigation"
import { routing } from "@/i18n/routing"

/** Small language select: same path, switch locale. */
export function LocaleSwitcher() {
  const t = useTranslations("Common")
  const locale = useLocale()
  const pathname = usePathname()
  const path = pathname || "/login"

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLocale = e.target.value
    if (newLocale && newLocale !== locale) {
      window.location.href = `/${newLocale}${path}`
    }
  }

  return (
    <div className="mt-6 flex flex-col items-center gap-1.5">
      <label htmlFor="locale-select" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {t("language")}
      </label>
      <select
        id="locale-select"
        value={locale}
        onChange={handleChange}
        className="h-8 min-w-[7rem] rounded-md border border-border bg-background px-2.5 text-sm text-foreground outline-none transition-colors focus:ring-2 focus:ring-ring"
        aria-label={t("language")}
      >
        {routing.locales.map((loc) => (
          <option key={loc} value={loc}>
            {loc === "en" ? t("english") : t("spanish")}
          </option>
        ))}
      </select>
    </div>
  )
}
