"use client"

import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"
import type { SettingsNavItem, SettingsSectionId } from "./settings-sections"

type SettingsNavProps = {
  items: SettingsNavItem[]
  activeId: SettingsSectionId
  onSelect: (id: SettingsSectionId) => void
  /** Compact row for mobile header inside main column. */
  variant?: "rail" | "compact"
  className?: string
}

const rowBase =
  "w-full rounded-lg px-3 py-2.5 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"

export function SettingsNav({
  items,
  activeId,
  onSelect,
  variant = "rail",
  className,
}: SettingsNavProps) {
  const t = useTranslations("Settings")

  if (variant === "compact") {
    return (
      <nav
        className={cn("flex gap-2 overflow-x-auto scrollbar-hide", className)}
        aria-label={t("navSectionsAriaLabel")}
      >
        {items.map((item) => {
          const active = item.id === activeId
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                active
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
              )}
              aria-current={active ? "page" : undefined}
            >
              {item.label}
            </button>
          )
        })}
      </nav>
    )
  }

  return (
    <nav className={cn("w-full min-w-0", className)} aria-label={t("navAriaLabel")}>
      <h2 className="mb-3 px-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {t("title")}
      </h2>
      <ul className="space-y-0.5">
        {items.map((item) => {
          const active = item.id === activeId
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onSelect(item.id)}
                className={cn(
                  rowBase,
                  active
                    ? "bg-muted/80 font-medium text-foreground"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                )}
                aria-current={active ? "page" : undefined}
              >
                {item.label}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
