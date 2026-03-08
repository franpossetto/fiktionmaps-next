"use client"

import { useThemeSettings } from "@/lib/theme-settings-context"
import { Sun, Moon } from "lucide-react"

export function ThemeToggle() {
  const { setBase, setMode, effectiveBase } = useThemeSettings()
  const isDark = effectiveBase === "dark"

  const handleToggle = () => {
    setMode("manual")
    setBase(isDark ? "light" : "dark")
  }

  return (
    <button
      onClick={handleToggle}
      className="flex h-10 w-10 items-center justify-center rounded-xl text-chrome-muted transition-all duration-200 hover:bg-chrome-hover hover:text-foreground"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? (
        <Sun className="h-[18px] w-[18px]" />
      ) : (
        <Moon className="h-[18px] w-[18px]" />
      )}
    </button>
  )
}
